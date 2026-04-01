# SLOUBED Product Guide — 배포 가이드

## 파일 구조

```
sloubed-guide/
├── server.js        ← Node.js 서버 (API + 정적 파일 서빙)
├── config.js        ← API URL 설정 (로컬 ↔ Railway 자동 분기)
├── data.json        ← 제품 데이터 저장소
├── package.json
├── manifest.json    ← 피그마 플러그인 설정
├── code.js          ← 피그마 플러그인 로직
├── ui.html          ← 피그마 플러그인 UI
├── index.html       ← 판매사원/고객 대시보드
└── admin.html       ← 관리자 페이지
```

---

## 1단계 — GitHub 업로드

```bash
git init
git add .
git commit -m "first commit"

# GitHub에서 새 레포 생성 후
git remote add origin https://github.com/[내계정]/sloubed-guide.git
git push -u origin main
```

---

## 2단계 — Railway 배포

1. [railway.app](https://railway.app) 접속 → **GitHub으로 로그인**
2. **New Project** → **Deploy from GitHub repo**
3. 방금 만든 `sloubed-guide` 레포 선택
4. 자동 배포 시작 → 완료되면 URL 발급

   예시: `https://sloubed-guide-production.up.railway.app`

5. **Settings → Networking → Generate Domain** 클릭 (도메인이 없으면 수동 생성)

---

## 3단계 — URL 3곳 교체

발급받은 URL로 아래 3개 파일을 수정하세요.

### config.js (대시보드용)
```js
const RAILWAY_URL = 'https://sloubed-guide-production.up.railway.app'; // ← 여기
```

### code.js (피그마 플러그인용)
```js
const SERVER_URL = 'https://sloubed-guide-production.up.railway.app'; // ← 여기
```

### manifest.json (피그마 네트워크 허용)
```json
"allowedDomains": [
  "http://localhost:3000",
  "https://sloubed-guide-production.up.railway.app"  // ← 여기
]
```

수정 후 `git push`하면 Railway가 자동 재배포합니다.

---

## 4단계 — 피그마 플러그인 재등록

manifest.json이 바뀌었으므로 Figma에서 플러그인 재로드가 필요합니다.

```
Figma → Plugins → Development → Import plugin from manifest
→ 수정된 manifest.json 선택
```

---

## 5단계 — 접속 확인

| 대상 | URL |
|---|---|
| 판매사원/고객 대시보드 | `https://sloubed-guide-production.up.railway.app` |
| 관리자 페이지 | `https://sloubed-guide-production.up.railway.app/admin` |
| API | `https://sloubed-guide-production.up.railway.app/api/products` |

---

## 로컬 개발 (기존 방식 그대로)

```bash
node server.js
# → http://localhost:3000
```

config.js가 `localhost` 환경을 자동 감지하므로 코드 수정 없이 로컬에서도 정상 작동합니다.

---

## Railway 무료 플랜 주의사항

- 월 **500시간** 무료 (약 21일 상시 운영 가능)
- 유료 전환 시 $5/월 → 무제한
- **data.json은 재배포 시 초기화**될 수 있음
  → 중요한 제품 데이터는 Railway 대시보드의 **Volume** 기능으로 영구 저장 권장
  → 또는 관리자 페이지에서 정기 백업

---

## 피그마 플러그인 저장 흐름

```
Figma 플러그인 입력
       ↓
code.js → POST https://[railway-url]/api/products
       ↓
data.json 저장
       ↓
index.html 5초 폴링으로 자동 반영
       ↓
판매사원 / 고객 화면 업데이트
```
