# Node version select karein
FROM node:22

# App directory banayein
WORKDIR /app

# Dependencies install karein
COPY package*.json ./
RUN npm install

# Baaki saara code copy karein
COPY . .

# Port expose karein (jo aapne server.js mein rakha hai)
EXPOSE 3001

# App start karein
CMD ["node", "server.js"]