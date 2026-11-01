# Cloud Tunnel

Phone + Google Drive, ek jagah. Ye app sirf ek **tunnel** hai — koi server nahi,
kisi ka data app ke paas rukta hi nahi. Har user apna phone aur apna Drive jodta hai.

## Chalana
Files ko kisi static hosting (GitHub Pages) par daal do, ya local server se kholo.
Phone ke browser me kholkar "Add to Home screen" karne se app jaisa install ho jata hai.

## Google Client ID banana (ek baar, 2 minute)
Drive connect ke liye ye chahiye — app ke malik ke Google account se banta hai,
baaki users ko ye nahi karna padta, woh sirf apna Drive login karenge.

1. console.cloud.google.com kholo → New Project → naam "Cloud Tunnel" → Create
2. APIs & Services → Library → "Google Drive API" search karke Enable karo
3. APIs & Services → OAuth consent screen → External → app naam "Cloud Tunnel" → save
4. APIs & Services → Credentials → Create Credentials → OAuth client ID → Web application
5. "Authorised JavaScript origins" me apni site ka address daalo
   (jaise https://legendrockkk.github.io aur http://localhost:8000)
6. Bani hui Client ID copy karke app ke Settings me daal do

## Kya-kya hota hai
- Phone ki files/folder jodo → Gallery + Files me local files dikhengi
- Drive connect → Drive ki photos/videos wahi gallery me, 📱/☁️ badge ke saath
- Drive file par tap → andar hi preview/play; Delete → Drive ke Trash me jati hai
- Phone file ke ☁️⬆️ button se woh file Drive me upload hoti hai
- Transfer page: file ka link paste karo → seedha Drive me (jo site CORS rok de,
  waha file pehle phone me karke bhejni hogi)

## Halka design
- Koi framework/library nahi — sirf HTML/CSS/JS, 1GB RAM phone par bhi chale
- Kamzor phone pehchan kar app apne aap Lite mode me chala jata hai (animation band)
- Animations sirf halke fade/scale (200ms) — simple look, koi chamak-dhamak nahi
