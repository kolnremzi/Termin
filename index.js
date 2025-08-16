require('dotenv').config();
const axios = require("axios").default;
const { wrapper } = require("axios-cookiejar-support");
const tough = require("tough-cookie");

const jar = new tough.CookieJar();
const client = wrapper(axios.create({ jar, withCredentials: true }));

// 📌 Telegram Ayarları
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; // .env dosyasından alınır
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;       // .env dosyasından alınır

let lastStart = null;

// 📌 Telegram'a mesaj gönderme fonksiyonu
async function sendTelegramMessage(message) {
    try {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message
        });
        console.log(`📨 Telegram mesajı gönderildi: ${message}`);
    } catch (err) {
        console.error("❌ Telegram mesajı gönderilemedi:", err.message);
    }
}

async function fetchTimeslots() {
    try {
        // 1️⃣ İlk POST isteği: Session başlat
        await client.post(
            "https://www.qtermin.de/site?pageidx=2&z=45039&storeip=true",
            {},
            {
                headers: {
                    "Accept": "application/json, text/plain",
                    "Content-Type": "application/json",
                    "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 Edg/139.0.0.0",
                    "Referer": "https://www.qtermin.de/qtermin-stadtheilbronn-abh",
                    "Origin": "https://www.qtermin.de",
                    "Cache-Control": "no-cache",
                    "Pragma": "no-cache",
                    "webid": "qtermin-stadtheilbronn-abh"
                }
            }
        );

        // 2️⃣ GET isteği: Takvim verisini al
        const dateParam = new Date().toISOString().split("T")[0];
        const timeslotUrl = `https://www.qtermin.de/api/timeslots?date=${dateParam}&serviceid=144511&rangesearch=1&caching=false&capacity=1&duration=20&cluster=false&slottype=0&fillcalendarstrategy=0&showavcap=false&appfuture=270&appdeadline=480&appdeadlinewm=1&oneoff=null&msdcm=0&calendarid=`;

        const res = await client.get(timeslotUrl, {
            headers: {
                "Accept": "application/json, text/plain",
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 Edg/139.0.0.0",
                "Referer": "https://www.qtermin.de/qtermin-stadtheilbronn-abh",
                "Origin": "https://www.qtermin.de",
                "Cache-Control": "no-cache",
                "Pragma": "no-cache",
                "webid": "qtermin-stadtheilbronn-abh"
            }
        });

        if (res.data && res.data.length > 0) {
            const currentStart = res.data[0].start;

            if (lastStart === null) {
                lastStart = currentStart;
                console.log(`[İlk Kayıt] start: ${currentStart}`);
                await sendTelegramMessage(`İlk Kayıt: ${currentStart}`);
            } else if (currentStart !== lastStart) {
                const message = `🚨 Tarih değişti!\nÖnceki: ${lastStart}\nYeni: ${currentStart}`;
                console.log(message);
                await sendTelegramMessage(message);
                lastStart = currentStart;
            } else {
                console.log(`[${new Date().toLocaleTimeString()}] Değişiklik yok. start: ${currentStart}`);
            }
        } else {
            console.log("⚠️ Response boş veya beklenen formatta değil.");
        }

    } catch (err) {
        console.error("❌ İstek hatası:", err.response?.status || err.message);
    }
}

// İlk çalıştırma
fetchTimeslots();

// Her 10 dakikada bir tekrar et
setInterval(fetchTimeslots, 3 * 60 * 1000);
