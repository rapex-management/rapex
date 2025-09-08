FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
# Build for stable development (no file watching)
RUN npm run build
# Use production mode for stable development
CMD ["npm", "run", "start"]
