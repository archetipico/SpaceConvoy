#!/bin/bash

echo "> Initialization process"

read -p "Initialize certificate? (Previous certificates will be lost) [y/N]: " ANSW
if [[ "$ANSW" == "Y" || "$ANSW" == "y" ]]; then
    openssl req -newkey rsa:4096 -new -nodes -x509 -days 3650 -keyout key.pem -out cert.pem
fi

echo "> Generating logs"
read -p "Initialize files? (Previous logs will be lost) [y/N]: " ANSW
if [[ "$ANSW" == "Y" || "$ANSW" == "y" ]]; then
    rm journal
    rm ./public/log

    touch journal
    touch ./public/log
fi

echo "> Success"
