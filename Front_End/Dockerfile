#Step 1: Encapsulate the front-end
FROM node:22 AS build
WORKDIR /Front_End

# Install the dependencies
COPY package.json package-lock.json ./
RUN npm install -g @angular/cli
RUN npm install

# Copy all project files
COPY . .

EXPOSE 4200
CMD ["ng", "serve", "--host", "0.0.0.0"]


