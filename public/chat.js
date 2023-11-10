// Initalize socket
const socket = io();

// Set username cookie
function setCookie(name, value, expDays) {
    const date = new Date();
    date.setTime(date.getTime() + expDays * 24 * 60 * 60 * 1000);
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + value + "; " + expires + "; path=/; samesite=Strict; secure";
}

// Get username cookie
function getCookie(name) {
    const cookieName = name + "=";
    const arr = decodeURIComponent(document.cookie).split(';');

    for (let i = 0; i < arr.length; i++) {
        let cookie = arr[i].trim();
        if (cookie.startsWith(cookieName)) {
            return cookie.substring(cookieName.length);
        }
    }

    return "";
}

// Retrieve username cookie
const user = getCookie("username");
// If no username cookie is found, ask for a username
if (user === "") {
    const user = prompt("Choose a username:");

    if (!user) {
        setCookie("username", "Anonymous", 30);
    } else {
        setCookie("username", user, 30);
    }
}

let actualDate = "";

// Handle messages
function sendMessage(data, type, append) {
    let msg = data.msg;
    let result = "";

    // Handle server messages
    if (type === 1) {
        // If the username changed I'll receive an array
        if (Array.isArray(msg)) {
            msg = "'" + msg[0] + "' is now known as '" + msg[1] + "'";
        }

        const serverMessage = "<div class=\"serverMessage\"><p>" + msg + "</p></div>";
        if (append) {
            $("#chat").append(serverMessage);
        } else {
            $("#chat").prepend(serverMessage);
        }

        return "server";
    // Handle datetime messages
    } else if (type === 2) {
        if (append) {
            $("#chat").append("<div class=\"datetimeMessage\"><p>" + data + "</p></div>");
            actualDate = data;
        } else {
            $("#chat").prepend("<div class=\"datetimeMessage\"><p>" + data + "</p></div>");
        }

        return "datetime";
    }

    // Handle regular user messages
    for (const word of msg.split(" ")) {
        const reURL = new RegExp("^(http://|https://|www\\.)");

        // Check for URLs in the message and format them as links if needed
        result += reURL.test(word) ? "<a href=\"" + word + "\" target=\"_blank\">" + word + "</a>" : word;
        result += " ";
    }

    // Check if the user is the sender for styling
    let userMessage = "";
    if (data.usr === cookie.get("username")) {
        userMessage = "<div class=\"userMessage userMessageSender\"><p class=\"text\">" + result + "</p><p class=\"time\">" + data.t.slice(-8, -3) + "</p></div>";
    } else {
        userMessage = "<div class=\"userMessage\"><p class=\"username\">" + data.usr + "</p><p class=\"text\">" + result + "</p><p class=\"time\">" + data.t.slice(-8, -3) + "</p></div>";
    }

    if (append) {
        $("#chat").append(userMessage);
    } else {
        $("#chat").prepend(userMessage);
    }

    return "user";
}

/*
 * 1) Retrieve the log file
 * 2) Split it into lines
 * 3) Retrieves only 20 messages at a time, in reverse order (`bottomMessage` refers to the newest message shown
 *      in the chat, while `topMessage` refers to the oldest message). The array is read
 *      in reverse because the messages are `preappended` (read function `sendMessage()`).
 * 4) If i < 0, thus the array has ended, the function stops.
 * 5) Else, it parses the array element as JSON.
 * 6) Check if the data contains text (`data.msg`), which can be a userMessage (0),
 *    a serverMessage (1), or a datetimeMessage (2). A datetimeMessage is sent when
 *    the message date is different from the previous message date, indicating messages
 *    sent on different days. The function handles exceptions using try-catch for cases
 *    where `lines[i-1]` may be out of the array's bounds, indicating the first message.
 *    When `i == lines.length - 2` (first loop iteration), it sets `actualDate` as `time`,
 *    preventing the repetition of the current date in subsequent messages. This
 *    is necessary, since if the chat last message is from i.e. today, if we write a message
 *    we want to avoid to repeat that today is the day dd/mm/YYYY, since it's already been
 *    written by this function.
 * 7) Manages the scrolling behavior based on `bottomMessage` and `topMessage`
 *    - Scrolls to the bottom of the chat if `bottomMessage` is 0 (initial load or new messages)
 *    - Adjusts the scroll position to an offset of 20 for user or manual scrolling, ensuring optimal scrolling behavior
 *    - Ensures the chat scrolls smoothly without the need to scroll down and then up again for upward scrolling
 */

let bottomMessage = 0;
let topMessage = 20;

function loadChat() {
    $.get("log", (log) => {
        const lines = log.split("\n");

        for (let i = lines.length - bottomMessage - 2; i > lines.length - topMessage - 2; i--) {
            if (i < 0) {
                return false;
            }

            const data = JSON.parse(lines[i]);

            if (data.msg) {
                if (data.type == "user") {
                    sendMessage(data, 0, false);
                } else {
                    sendMessage(data, 1, false);
                }

                const time = data.t.slice( -19, -8 );
                if (i == lines.length - 2) {
                    actualDate = time;
                }

                try {
                    const prevTime = JSON.parse(lines[i-1]).time.slice(-19, -8);
                    if (time !== prevTime) {
                        sendMessage(time, 2, false);
                    }
                } catch (e) {
                    sendMessage(time, 2, false);
                }
            }
        }

        if ( bottomMessage == 0 ) {
            $("#chat").scrollTop($("#chat")[0].scrollHeight);
        } else {
            $("#chat").scrollTop(20);
        }
    }).fail( () => {
        sendMessage({
            "t": "01/01/1984 00:00:00",
            "usr": "Warning",
            "msg": "The chat can't be loaded",
            "type": "server"
        }, 1, false );
    });
}

// When the document loads, the chat loads too
loadChat(bottomMessage, topMessage);

/*
 * If the vertical scrolling position of the chat container is = 1
 * (indicating that the user has scrolled to the upper end of the div),
 * `bottomMessage` and `topMessage` are both incremented by 20 to load the
 * previous 20 messages. The `loadChat()` function is then called to load
 * these additional messages.
 */
$("#chat").scroll(() => {
    if ($("#chat").scrollTop() <= 1) {
        bottomMessage += 20;
        topMessage += 20;
        loadChat();
    }
});

// Users counter
socket.on("count", (c) => {
    // Update counter
    $("#counter").html(c + " online");
});

// Get and set messages received from the socket
socket.on("message", (data) => {
    if (data.msg) {
        // Extract time from data
        const time = data.t.slice( -19, -8 );
        // Check if time is different from the current actualDate
        if (time != actualDate) {
            actualDate = time;
            sendMessage(time, 2, true);
        }

        if (data.type == "user") {
            sendMessage(data, 0, true);

            bottomMessage++;
            topMessage++;
        } else {
            sendMessage(data, 1, true);

            bottomMessage++;
            topMessage++;
        }

        $("#chat").scrollTop($("#chat")[0].scrollHeight);
    }
});

// Handle username update
$("#username").submit( e => {
    // Prevent the default form submission behavior
    e.preventDefault();
    const input = $(e.target).find("input");

    const date = new Date();
    const username = input.val();

    const oldUser = cookie.get("username") || "Anonymous";
    cookie.set("username", username);
    const newUser = cookie.get("username") || "Anonymous";

    socket.emit("message", {
        t:
            ("0" + date.getDate()).slice(-2) + "/" +
            ("0" + (date.getMonth() + 1)).slice(-2) + "/" +
            date.getFullYear() + " " +
            ("0" + date.getHours()).slice(-2) + ":" +
            ("0" + date.getMinutes()).slice(-2) + ":" +
            ("0" + date.getSeconds()).slice(-2),
        usr: "Info",
        msg: [oldUser, newUser],
        type: "server"
    });

    e.target.reset();
    input.focus();
});

// Handle sending messages
$("#send-activity").submit(e => {
    // Prevent the default form submission behavior
    e.preventDefault();
    const input = $(e.target).find("#send-recipient");

    const msg = input.val();
    const date = new Date();

    // Check if the message is not empty
    if (msg) {
        // Emit a message to the server with the message information
        socket.emit("message", {
            t:
                ("0" + date.getDate()).slice(-2) + "/" +
                ("0" + (date.getMonth() + 1)).slice(-2) + "/" +
                date.getFullYear() + " " +
                ("0" + date.getHours()).slice(-2) + ":" +
                ("0" + date.getMinutes()).slice(-2) + ":" +
                ("0" + date.getSeconds()).slice(-2),
            usr: cookie.get("username") || "Anonymous",
            msg: msg,
            type: "user"
        });

        // Reset the form input and set the focus back to the input field
        e.target.reset();
        input.focus();
    }
});
