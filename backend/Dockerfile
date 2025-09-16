FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
EXPOSE 5000
# Copy the Samba user script into the container
COPY ./scripts/create_samba_user.sh /app/scripts/create_samba_user.sh

# Make the script executable
RUN chmod +x /app/scripts/create_samba_user.sh

CMD ["node", "index.js"]
