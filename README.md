# BloodLink — Mobile

The donor-facing app: find out whether you may give blood today, answer an emergency
call-up from a nearby hospital, book an appointment, and keep your own donation history.
Built to stay usable on the connection you actually get inside a shopping mall.

This is the **mobile app only**. It is one of three repositories:

| Repository | Role |
|---|---|
| [`bloodlink`](https://github.com/Falllll/bloodlink) | Laravel API — headless, the only thing that touches the database |
| [`bloodlink-web`](https://github.com/Falllll/bloodlink-web) | Next.js console for hospital staff and admins |
| **`bloodlink-mobile`** (this repo) | Expo app for donors |

---

## The problem

A blood bank's hardest problem is not storage, it is reach. When a hospital needs O− in
the next four hours, it has to find the handful of people who are both nearby and
*actually eligible today* — and then get an answer from them. Broadcast messages reach
everybody and convince nobody, and a donor who was deferred last week has no way of
knowing whether that deferral has expired.

This app is the donor's half of that loop. It answers one question on open —
*may I donate?* — and then two more: *am I being called?* and *can they still reach me?*

Three constraints shaped the architecture:

- **The connection is assumed to be bad.** Reads serve from a local cache when the network
  is gone; writes are queued with backoff and replayed, each carrying a stable idempotency
  key so a replay never books two appointments.
- **Health data never touches the disk.** Eligibility, profile and preference responses are
  deliberately excluded from the cache. A stale cached "eligible" could hide a deferral,
  and that is a clinical error, not a UX annoyance.
- **No permission dialog appears until the donor asks for it.** Mounting a screen only
  *reads* permission state. A prompt fired on mount is a prompt that gets denied.

---

## Screens

> Screenshots live in `docs/screenshots/`. See [Capturing screenshots](#capturing-screenshots).

| | |
|---|---|
| <img src="docs/screenshots/01-login.png" width="300"> | **Sign in** — `/login`<br>Email and password against the API's Sanctum token endpoint. Failures are branched on the error code, not the message: wrong credentials, too many attempts, or an honest fallback naming the code. |
| <img src="docs/screenshots/02-home.png" width="300"> | **Beranda** (tab 1) — `/`<br>Three cards in a fixed order, answering *may I donate*, *am I being called*, *can they reach me*. The eligibility pill is one of exactly three states — eligible, not eligible, **not yet determinable** — because "not eligible" and "we cannot tell yet" are different clinical answers and collapsing them into a boolean is a medical bug. |
| <img src="docs/screenshots/03-home-deferred.png" width="300"> | **Beranda — deferred donor**<br>When a deferral or an administrative flag is active, the retry line never promises "you may donate again on X". It says the status can be reviewed from that date, because a retry date is only a promise if waiting is the one and only obstacle. |
| <img src="docs/screenshots/04-requests.png" width="300"> | **Permintaan** (tab 2) — `/requests`<br>Call-ups from facilities: urgency chip, component, time remaining, and the distance recorded at the moment the donor was contacted. Open rows get side-by-side accept / decline; answered rows get a sentence. |
| <img src="docs/screenshots/05-request-detail.png" width="300"> | **Call-up detail** — `/requests/[id]`<br>The full invitation with large accept and decline actions. There is no single-invitation endpoint, so the row is located inside the cached list — a cold start from a notification triggers one list reload, and says so rather than showing an empty screen. |
| <img src="docs/screenshots/06-schedule-booking.png" width="300"> | **Jadwal** (tab 3) — `/schedule`<br>With nothing booked: a horizontal day strip 14 days ahead and 30-minute slots. Slots are a display convenience only — the server is the sole judge of a booking, and the app does not pretend to know which are taken. |
| <img src="docs/screenshots/07-schedule-open.png" width="300"> | **Jadwal — appointment booked**<br>The next appointment with reschedule and cancel. Rescheduling shows an explicit warning first, because it cancels the existing slot before a new one is chosen. Once a donor has arrived or been screened, the buttons give way to an on-site note. |
| <img src="docs/screenshots/08-profile.png" width="300"> | **Profil** (tab 4) — `/profile`<br>Donor identity and contact details, a donation count and last-donation date, and paginated donation history. |
| <img src="docs/screenshots/09-profile-notifications.png" width="300"> | **Profil — notifications**<br>Device registration state (six distinct states, including blocked at OS level and granted-but-unregistered) and per-category opt-outs. Leaving the emergency call list requires an explicit confirmation — the client refuses to send the request without it, and the API refuses it too. |
| <img src="docs/screenshots/10-offline.png" width="300"> | **Offline**<br>A global banner reports lost connectivity and how many actions are waiting to be sent. Cached lists are labelled as stored data rather than passed off as fresh. |
| <img src="docs/screenshots/11-not-linked.png" width="300"> | **Account not yet linked**<br>A first-class, expected state: a user account must be linked to a donor record by facility staff before anything works. All four tabs say so plainly instead of showing an error. |

All user-facing copy is Indonesian.

---

## Stack

| | |
|---|---|
| Runtime | Expo SDK **57**, React Native **0.86.3**, React **19.2.3** |
| Language | TypeScript **6** (`strict`), path alias `@/*` → `src/*` |
| Routing | `expo-router` **57** — file-based, with `Stack.Protected` guards on session state |
| Storage | `expo-secure-store` (session token), `expo-sqlite/kv-store` (cache + retry queue) |
| Network | `fetch` + `expo-network` for reachability, `expo-crypto` for idempotency keys |
| Location | `expo-location` + `expo-task-manager` |
| Push | `expo-notifications` — native FCM/APNs token, registered with the API |
| Visual | `expo-blur`, `expo-symbols`, Sora + Manrope via `expo-font` |

`AsyncStorage` is not used anywhere, by rule. No Firebase JS SDK and no
`google-services.json` in the repo — the app hands the native device token to the backend
and the backend talks to FCM itself.

No Node version is declared in `package.json`; CI runs on **Node 22**.

> Install Expo packages with `npx expo install <pkg>`, never `npm install <pkg>`, so
> versions stay pinned to the SDK.

---

## Running it

The API must be running. There is no BFF and no mock layer — this app calls the Laravel
API directly with a bearer token, and sign-in itself is an API call, so without the
backend you cannot get past the login screen.

```bash
npm install
cp .env.example .env
# set EXPO_PUBLIC_API_BASE_URL for your target — see below
npx expo start
```

### Environment

One variable:

```
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000/api/v1
```

It is the API base **including** the `/api/v1` prefix, read once at module scope. If it is
unset, the first request throws and the app is unusable.

`EXPO_PUBLIC_*` values are bundled into the app binary and are **not secrets**. Nothing
secret belongs in this file.

The host depends on where the app runs:

| Target | Host |
|---|---|
| Android emulator | `http://10.0.2.2:8000/api/v1` — `10.0.2.2` is the emulator's alias for the host machine |
| iOS simulator | `http://localhost:8000/api/v1` |
| Physical device via Expo Go | `http://<your-LAN-IP>:8000/api/v1` |

### Expo Go vs a development build

Most of the app runs in **Expo Go**: sign-in, secure token storage, all four tabs, the
call-up list and detail with accept/decline, appointment booking, rescheduling,
cancellation and history, profile and donation history, notification category preferences,
the offline banner, cache, retry queue and optimistic updates, the fonts and glass
styling, and foreground location permission and fixes.

Two things genuinely do not, and the app detects this rather than failing mysteriously:

- **Push notifications** need a development build *and* a physical device. Expo Go for SDK
  57 lacks the native modules `expo-notifications` requires at import time — a static
  import crashes the app outright — so the module is required lazily behind an Expo Go
  check, and the notification card reports an unsupported state on Expo Go, emulators and
  simulators. Remote push does not work in Expo Go regardless.
- **Background location tracking** needs a development build. On Expo Go it is reported as
  off rather than crashing.

There is no `ios/` or `android/` directory committed and no `eas.json`, so a development
build means running `npx expo prebuild` or configuring EAS Build yourself.

### Checks

```bash
npx tsc --noEmit
npm run lint
```

One gotcha: typed routes only type-check once `.expo/types/router.d.ts` exists, and Expo
writes that file only from a running Metro server (`.expo/` is gitignored). CI boots
`npx expo start --offline` purely to generate it before running `tsc`. On a fresh clone,
`tsc --noEmit` will not actually verify route links until Metro has run once.

CI (`.github/workflows/ci.yml`): gitleaks secret scan →
`npm audit --audit-level=critical` → typed-route generation → `tsc --noEmit` → ESLint.

---

## How it hangs together

### Offline reads: cache with an honest label

GET requests go through `fetchWithCache`, backed by `expo-sqlite/kv-store` under the key
prefix `bl:`. A cache entry younger than five minutes is served without a request at all.
When the network is gone, a *stale* entry is served and flagged, and the UI labels it as
stored data — showing a donor an empty list when the app holds yesterday's answer is worse
than showing yesterday's answer and saying so.

**Health and contact data are deliberately never cached.** Eligibility, donor profile and
notification preferences use a bare fetch, with that rule written into the code at each
call site. Only invitations, appointments and donation history are cached, and signing out
wipes every one of their keys.

### Offline writes: a queue with one key per action

A mutation that fails for a retryable reason is persisted as a queue row and replayed with
exponential backoff — `min(2^attempts × 1000, 60000) ms` plus up to 250 ms of jitter, five
attempts maximum. Retryable means network unavailable, request in progress, rate limited
or an internal server error; a validation failure is permanent and is dropped and reported
instead.

The queue is flushed when connectivity returns, re-armed on a timer for the earliest
pending attempt, and drained once on launch for rows left behind by a previous session.

Every write carries an `Idempotency-Key`, generated **once per user action** and reused by
every retry, direct or queued. Minting a fresh key per retry is the classic way to turn
one flaky booking into three real ones, so the queue deliberately replays with the stored
key.

Optimistic updates run through a single hook with a five-state machine —
`idle → pending → queued | done | failed`. It writes the optimistic row into the calling
screen's state and rolls it back on permanent failure. One documented limitation:
optimistic rows live in React state only, so restarting the app discards them and there is
nothing left to roll back.

### Session and token

The Sanctum bearer token lives only in `expo-secure-store` — iOS Keychain, Android
Keystore — and is read per request. Any `401` clears it and flips session status to signed
out, which `Stack.Protected` turns into an immediate return to the login screen. There is
no token refresh.

### Location: a permission ladder and a cheapest-path-first fix

Feature code never calls `expo-location` directly; everything goes through one hook. The
ladder is `undetermined → denied → foreground → background`, and the background request
refuses to run unless foreground is already granted — asking for background first makes
iOS show both prompts at once, which is how an app loses location permanently.

Getting a position tries three steps, cheapest first: a cached fix younger than five
minutes with no radio at all; then the OS's own last-known position (max age ten minutes,
required accuracy 1 km), still no radio; and only then an actual balanced-accuracy fix.
`watchPositionAsync` is never used. The background task — defined at module scope so the
OS can wake the bundle — moves on a 500 m distance interval with 15-minute deferral,
pauses itself automatically, and **writes only to the local cache; it makes no network
call**. Lists refresh on screen focus rather than on a timer, so nothing burns battery or
data in the background.

### Push registration and revocation

Only one hook and a module-scope listener touch `expo-notifications`; screens never do.
Registration is triggered by a button press and never on mount, so the OS prompt is always
user-initiated. It ensures the Android notification channel exists first, because Android
8+ silently drops notifications that arrive without one. It then fetches the native
FCM/APNs token and registers it with the API — and stores only the resulting record's
public id locally, never the token value itself.

Signing out **revokes the device before logging out**, in that order: the logout endpoint
destroys the Sanctum token server-side, so a delete sent afterwards would be answered 401
and leave the device a valid push recipient. Neither call is allowed to block sign-out.

### Design tokens

One import-free data module holds the colours, radii, spacing and surfaces: dark base
`#090C13`, crimson brand `#E8394B`, a six-step grey ramp, and a status palette shared with
the web console. The glass and flat surfaces mirror the `.glass` and `.flat` rules in
`bloodlink-web`'s stylesheet, and the blur intensity is calibrated to match it, so the two
front ends read as one product. Typography is a six-variant scale over Sora and Manrope,
and the splash screen is held until the fonts resolve so system-font text never flashes.

The glass panel degrades honestly: real blur on iOS, and on Android only above API 31 with
a blur target present — otherwise the designed flat surface, because on an API 35 emulator
the real blur rendered as an unreadable grey panel.

---

## Capturing screenshots

Screenshots are committed under `docs/screenshots/` so they survive forks and work
offline. Expected file names:

```
docs/screenshots/
  01-login.png                 07-schedule-open.png
  02-home.png                  08-profile.png
  03-home-deferred.png         09-profile-notifications.png
  04-requests.png              10-offline.png
  05-request-detail.png        11-not-linked.png
  06-schedule-booking.png
```

Capture on one device profile throughout — a Pixel-class Android emulator is enough, and
all eleven shots are reachable in Expo Go. Crop out the emulator chrome, keep the device
status bar, and compress before committing: `pngquant` or `oxipng -o4` typically cuts a
phone screenshot by 60–70 % with no visible loss, which keeps the whole set to a couple of
megabytes.

Two notes. Several shots need specific backend state — a deferral flag placed on the test
donor for the deferred-eligibility card, an open invitation for the call-up screens, an
unlinked user for the not-linked state — so seed those first. And the active notification
card cannot be captured in Expo Go at all; either omit that state or take it on a
development build.

Do not use real donor data in any shot. Names, donor numbers, dates of birth and
addresses all appear on the profile screen.

---

## Status

Honest about what this is: a portfolio project built to production discipline, not a
published app.

- **No automated tests in this repo**, and no placeholder test either — a green check that
  verifies nothing is worse than an honest gap. The CI gate is gitleaks, a critical-only
  dependency audit, typed-route generation, `tsc --noEmit` and ESLint. The domain logic
  that warrants testing lives in the backend repo, which does have a test suite.
- **Push notifications and background location require a development build**, and push
  additionally a physical device. See above.
- **Location is collected but no donor-facing feature consumes it yet.** The permission
  ladder, the cheapest-first fix cascade and the background task are all built and
  working, but the only thing reading them today is the permissions card, which merely
  displays state. The distance shown on a call-up is a server-side snapshot taken when the
  donor was contacted — it does not follow the donor. A distance-sorted nearby-request
  feed was descoped from the home screen for exactly this reason rather than faked on the
  client. Background updates stay off until a consumer exists.
- **No donor-facing screen requests location permission.** The permissions card offers
  only a link to OS settings; the request functions are wired up only in a development
  harness. A fresh install therefore cannot reach foreground permission through normal UI.
- **Authentication is sign-in only** — no registration, no password reset, no email
  verification, no biometric unlock, no token refresh.
- **Android does not get real glass blur.** The flat surface is used instead, pending
  verification on a physical device.
- **The interface is Indonesian only**, hardcoded, with no i18n layer. The web console has
  five locales; this app has one.
- **Two development-only harness routes ship in the source tree** (`/location-check`,
  `/offline-check`). Both render nothing outside development, but they are not behind the
  auth guards, and the offline harness still drives staff-side endpoints this app
  otherwise never calls.
- **Appointment opening hours are client-side display constants** and are not validated by
  the backend, which only requires a future time. No slot is ever shown as taken, because
  the client does not know capacity.
- **iOS is untested as far as this repo records.** Development has been Android-first: the
  default API host is the Android emulator alias, and the one QA note in the code concerns
  an Android emulator.
- A handful of Expo template leftovers remain in `assets/` and `package.json` and are
  being cleared out.

---

## Conventions

`main` is protected: squash-merged pull requests only, no direct pushes. One task equals
one commit. Commit messages, branch names, file names and code comments are in English;
user-facing copy is Indonesian.

`AGENTS.md` holds the full architecture decision record and the working rules for this
repo.
