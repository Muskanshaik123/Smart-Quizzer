# 🧠 SmartQuizzer – Adaptive AI Quiz Generator

An **AI-powered adaptive quiz platform** that transforms learning content into **personalized quizzes** using **Machine Learning, NLP, and real-time performance insights**.

SmartQuizzer dynamically adjusts **difficulty, question types, and learning paths** based on user performance, making learning smarter, faster, and more effective.

---

## 🚀 Key Highlights

✨ **Real AI & ML Integration**
✨ **Adaptive Learning Engine**
✨ **NLP-based Content Parsing**
✨ **Bloom’s Taxonomy-based Questioning**
✨ **Admin Analytics & Moderation Dashboard**

---

## 🧩 Modules Implemented

### 🔐 Module 1: User & Profile Management

* Email/Password login + OAuth
* User profile with:

  * Subject interests
  * Difficulty level
  * Performance history

---

### 📄 Module 2: Content Ingestion & Parsing

* Upload learning material via:

  * PDF
  * URL
  * Pasted text
* NLP-based:

  * Text cleaning
  * Segmentation into knowledge chunks

---

### ❓ Module 3: AI Question Generator Engine

* Transformer / rule-based question generation:

  * MCQs
  * Fill-in-the-blanks
  * True / False
  * Short answers
* Supports **Bloom’s Taxonomy** difficulty levels:

  * Remember
  * Understand
  * Apply
  * Analyze
  * Evaluate

---

### 📊 Module 4: Adaptive Learning Engine

* Tracks user performance continuously
* Updates difficulty profile in real time
* Recommends question types based on:

  * Accuracy
  * Response time
  * Learning trends

---

### 🖥️ Module 5: Web Interface & Quiz UI

* Clean and responsive quiz UI
* Real-time score summary
* Adaptive question flow per user session

---

### 🛠️ Module 6: Admin Dashboard & Feedback

* Question moderation
* User analytics
* Certificate generation & download
* Flagging inappropriate AI outputs

---

## ⚙️ Tech Stack

| Layer    | Technology                    |
| -------- | ----------------------------- |
| Frontend | HTML, CSS, JavaScript         |
| Backend  | Node.js, Express.js           |
| Database | SQLite                        |
| AI / ML  | NLP, Transformer-based models |
| Auth     | Sessions, OAuth               |
| Tools    | Git, VS Code                  |

---

## ⚡ Quick Setup (PowerShell)

### 1️⃣ Install Backend Dependencies

```powershell
cd e:\smart\backend
npm install
```

### 2️⃣ Create `.env` file (optional)

```env
PORT=5000
SESSION_SECRET=your_secret_here
EMAIL_USER=youremail@gmail.com
EMAIL_PASS=your_app_password
GEMINI_API_KEY=your_gemini_key
```

### 3️⃣ Start the Server

```powershell
node server.js
# or
npm start
```

---


## 📌 Security Notes

* Change `SESSION_SECRET` before deployment
* Enable HTTPS in production
* Secure cookies and API keys

---

## 🛣️ Future Enhancements

* 📄 Server-side PDF certificate generation
* 📊 CSV export for analytics
* 🧪 Unit & integration tests
* 🎨 Enhanced UI with charts
* 🤖 Advanced AI explainability for answers

---

## 🤝 Contributors

Want to contribute?
Fork the repo, create a branch, and submit a PR 🚀

---

## 📜 License

This project is licensed under the **MIT License** — free to use, modify, and distribute.

---

⭐ If you found this project useful, **don’t forget to star the repo!**


## 📄 Project Documentation

👉 https://github.com/Muskanshaik123/Smart-Quizzer/blob/master/Shaik%20muskan.pdf
