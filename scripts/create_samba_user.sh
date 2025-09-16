#!/bin/bash

# Arguments: username password
USERNAME=$1
PASSWORD=$2

# Check if user exists
if id "$USERNAME" &>/dev/null; then
    echo "User $USERNAME already exists"
else
    # Create system user without shell access
    useradd -M -s /sbin/nologin $USERNAME
fi

# Set Samba password
(echo "$PASSWORD"; echo "$PASSWORD") | smbpasswd -s -a $USERNAME

# Enable user in Samba
smbpasswd -e $USERNAME

# Create home directory if not exists
USER_DIR="/mount/$USERNAME"
mkdir -p $USER_DIR
chown $USERNAME:$USERNAME $USER_DIR
chmod 700 $USER_DIR

echo "Samba user $USERNAME created with home $USER_DIR"
