# V-Tech SUAS 2026 Ground Control Station

## Canlı MAVLink Bağlantısı (MAVProxy Köprüsü)

Tarayıcı WebSocket protokolü kullanır; MAVProxy ise `tcpin` protokolü kullanır.
Aralarında bir köprü (bridge) çalıştırmanız gerekir.

```
Terminal 1 — MAVProxy (uçak / SITL):
  mavproxy.py --master=COM3 --baudrate=921600 --out=tcp:127.0.0.1:14551

Terminal 2 — WebSocket Köprüsü:
  npm run bridge

Terminal 3 — GCS Arayüzü:
  npm start
```

Tarayıcıda GCS açılınca header'daki bağlantı düğmesine tıklayın:
- Protokol: **MAVLink**
- URL: `ws://localhost:14552`  ← köprü portu
- **BAĞLAN** butonuna basın

> **Not:** Bridge artık TCP *server* olarak çalışır (dinler).
> MAVProxy `--out=tcp:` ile bridge'e **bağlanır** (client).
> Eski `--out=tcpin:` komutu artık geçersizdir.

### Ortam Değişkenleri (isteğe bağlı)

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `MAVLINK_TCP_HOST` | `127.0.0.1` | MAVProxy TCP adresi |
| `MAVLINK_TCP_PORT` | `14551` | MAVProxy TCP portu |
| `BRIDGE_WS_PORT`   | `14552` | Tarayıcıya açılan WebSocket portu |

### SITL (Simülatör) ile Test

```
# ArduPilot SITL başlat
sim_vehicle.py -v ArduCopter --console --map

# Köprüyü başlat
npm run bridge

# MAVProxy SITL çıkışını bridge'e yönlendir
mavproxy.py --master=tcp:127.0.0.1:5760 --out=tcp:127.0.0.1:14551

# GCS URL: ws://localhost:14552
```

---

## Available Scripts

### `npm start`

Runs the app in the development mode.
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### `npm run bridge`

Starts the MAVLink WebSocket bridge server.
Connects to MAVProxy TCP on port `14551`, exposes WebSocket on port `14552`.

Override ports with environment variables:
```
MAVLINK_TCP_PORT=14550 BRIDGE_WS_PORT=14553 npm run bridge
```

### `npm run build`

Builds the app for production to the `build` folder.

### `npm test`

Launches the test runner in the interactive watch mode.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**
