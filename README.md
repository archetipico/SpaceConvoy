# Space Convoy
A compact LAN chat solution designed for seamless deployment within your network.

# Deployment
## Prerequisites
Requirements for this project (previous versions may work too)
```bash
node    v20.9.0
npm     10.2.3
```
Softwares used
```bash
openssl
```
## Installation
Enter the project folder and run
```bash
npm install
```
At process completion, execute
```bash
chmod 755 preamble.sh
./preamble.sh
```
## Starting
Just type (as root)
```bash
node index.js
```
or just
```bash
sudo node index.js
```
That's it.

An address will be printed, your chat is at
```markdown
https://<your-address>
```
If you have an issue, just remember that all your chat logs are inside `./public/log` while all your server logs are inside `./journal`.

Have fun!