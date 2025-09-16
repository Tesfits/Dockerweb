#!/bin/bash

# Usage: ./create_samba_user.sh username password

USERNAME="$1"
PASSWORD="$2"

# Exit if username or password is empty
if [[ -z "$USERNAME" || -z "$PASSWORD" ]]; then
  echo "Usage: $0 username password"
  exit 1
fi

# Create system user if it doesn't exist
if ! id "$USERNAME" &>/dev/null; then
  useradd -m "$USERNAME"
fi

# Set system user password (optional, requires running as root)
echo "$USERNAME:$PASSWORD" | chpasswd

# Add Samba user and set SMB password (must run as root)
(echo "$PASSWORD"; echo "$PASSWORD") | smbpasswd -s -a "$USERNAME"

# Enable Samba user
smbpasswd -e "$USERNAME"

echo "Samba user $USERNAME created/updated successfully"
