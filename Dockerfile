# Select 05/Environment
From node:22-alpine

# Choose working directory inside docker
WORKDIR/app

# copy package.json to install npm packages inside docker
# Copy source destination
COPY package.json ./

# Running shell command
RUN npm install

# Copy rest of the application
COPY . .

Run npm run build

# download nginx
From nginx:stable-alpine

COPY --from=build /app/dist/usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

?Port Exposure
EXPOSE 80

# Entry point
CMD["nginx", "-g" "daemon-off;"]

# docker  
# docker build -t backend -app
# docker run -d -p 5050:5050 --name backend backend-app
# docker ps -a
# docker stop CONTAINER_ID
# docker rm CONTAINER_ID
