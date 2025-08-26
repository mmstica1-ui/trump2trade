# ---- build stage ----
FROM node:18-alpine AS build
WORKDIR /app

# התקנות מהירות עם cache
COPY package*.json ./
RUN npm ci

# קוד המקור
COPY . ./

# קומפילציה ל-TS -> JS לתיקיית dist
RUN npx tsc -p tsconfig.json

# ---- runtime stage ----
FROM node:18-alpine AS runtime
WORKDIR /app

# רק מה שצריך להרצה (תלויות פרוד)
COPY package*.json ./
RUN npm ci --omit=dev

# נעתיק את הקוד המתורגם
COPY --from=build /app/dist ./dist

# אם יש assets/קבצי env נחוצים בזמן ריצה הוסף כאן COPY נוספים

ENV NODE_ENV=production
# Railway מספק PORT; ודא שהשרת מאזין אליו
ENV PORT=8080
EXPOSE 8080

# נקודת ההפעלה
CMD ["node", "dist/index.js"]