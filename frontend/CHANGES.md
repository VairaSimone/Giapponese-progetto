# CHANGES.md — Frontend: sistema ad inviti + approvazione insegnanti

> Sprint **solo frontend**. Allinea la UI React al backend già consegnato
> (registrazione pubblica rimossa, inviti studente, candidatura/approvazione
> insegnanti, ruolo `admin`, stato account). Valgono le stesse regole: file
> completi e production-ready, niente registrazione pubblica esposta.

---

## 1. Sintesi

- **Registrazione pubblica eliminata dalla UI.** Non esiste più un form di
  sign-up libero: la rotta `/register` ora è il **completamento registrazione
  su invito**, gated dal token nell'URL. Tutti i link "Registrati" sono stati
  rimossi/riconvertiti.
- **Studente** → completa il profilo solo via link di invito (`/register?token=`).
- **Insegnante** → **candidatura pubblica** (`/candidatura-insegnante`,
  approvazione admin) **oppure** invito diretto dell'admin (stesso flusso del
  token studente, senza classe).
- **Admin** → nuovo ruolo riconosciuto da guard di rotta, navigazione e UI;
  pannello **candidature insegnante** (approva/rifiuta) e creazione **inviti
  insegnante**.

---

## 2. Rotte (react-router)

| Rotta | Accesso | Pagina |
|---|---|---|
| `/register?token=…` | pubblica (non autenticati) | completamento registrazione su invito |
| `/candidatura-insegnante` | pubblica (non autenticati) | candidatura insegnante |
| `/gestione/utenti` | insegnante **o admin** | gestione utenti (già esistente, ora aperta anche all'admin) |
| `/gestione/inviti` | insegnante **o admin** | gestione inviti (nuova) |
| `/admin/candidature` | **solo admin** | approvazione candidature insegnante (nuova) |

`ProtectedRoute` è invariato come componente: i nuovi vincoli passano da
`allowedRoles`. Costanti rotte in `constants/routes.js`.

---

## 3. Flussi implementati

**Studente (su invito)** — `RegisterPage`:
1. La pagina legge `?token=` e chiama `GET /api/invites/validate/:token`
   (`useInviteToken`).
2. Token assente → schermata "Serve un invito" con rimando al login.
   Token non valido/scaduto/usato → schermata d'errore (messaggio localizzato
   dal `code` backend).
3. Token valido + `ruolo=studente` → form **Nome, Cognome, Età, Password**,
   con **email e classe in sola lettura** (ereditate dall'invito) →
   `POST /api/auth/register-student`.

**Insegnante (invito diretto admin)** — stessa `RegisterPage`: con
`ruolo=insegnante` il form mostra **Nome, Cognome, Password** (niente classe né
età) → `POST /api/auth/register-teacher`.

**Insegnante (candidatura)** — `TeacherRequestPage`:
form pubblico **Nome, Cognome, Email, Password, Messaggio (facoltativo)** →
`POST /api/auth/teacher-request`. La schermata di successo chiarisce che
l'account è **in attesa di approvazione** e che il login non è ancora possibile.

**Inviti (insegnante/admin)** — `InvitesManagementPage`:
- creazione invito studente (email + classe);
- creazione invito insegnante (solo admin, email);
- elenco inviti con badge **ruolo/classe/stato/scadenza** e **revoca** dei
  pendenti (filtro per stato).

**Candidature (admin)** — `AdminTeacherRequestsPage`:
elenco candidature (default: in attesa; filtro stato), con **Approva** e
**Rifiuta** (conferma su rifiuto). La nota di candidatura è mostrata quando
presente.

---

## 4. Allineamento al backend

- **`services/authService.js`**: rimossa `register`; aggiunte `registerStudent`,
  `registerTeacher`, `teacherRequest`.
- **`services/invitesService.js`** (nuovo): `createStudentInvite`,
  `createTeacherInvite`, `validateInviteToken`, `getInvites`, `revokeInvite`.
- **`services/adminService.js`** (nuovo): `getTeacherRequests`, `approveTeacher`,
  `rejectTeacher`.
- **Hooks** (React Query): `useInviteToken`, `useInviteRegistration`
  (`useRegisterStudent`/`useRegisterTeacher`/`useTeacherRequest`), `useInvites`
  (lista/crea/revoca), `useTeacherRequests` (lista/approva/rifiuta). Le mutation
  invalidano le query corrette (`invites`, `teacherRequests`, e `users` dopo
  un'approvazione).
- **`constants/domain.js`**: ruolo `ADMIN`; `ACCOUNT_STATES`
  (`attivo`/`in_attesa`/`rifiutato`); `INVITE_STATES`; `INVITE_ROLES`; nuovi
  `API_ERROR_CODES` (ACCOUNT_PENDING, ACCOUNT_NOT_ACTIVE, GOOGLE_NO_ACCOUNT,
  INVALID_INVITE, INVITE_EXPIRED, INVITE_ALREADY_USED, INVITE_ROLE_MISMATCH,
  INVITE_NOT_FOUND, INVITE_NOT_PENDING, EMAIL_ALREADY_REGISTERED, INVALID_CLASS,
  REQUEST_NOT_FOUND, ALREADY_ACTIVE, ADMIN_ROLE_FORBIDDEN, LAST_ADMIN).
- **`validators/authSchemas.js`**: rimosso `buildRegisterSchema`; aggiunti
  `buildRegisterStudentSchema`, `buildRegisterTeacherSchema`,
  `buildTeacherRequestSchema`, `buildStudentInviteSchema`,
  `buildTeacherInviteSchema` (regole 1:1 con i validator Express).
- **`store/authStore.js`**: selettori `selectIsAdmin` e `selectCanManage`
  (insegnante o admin).

---

## 5. Sicurezza / coerenza UI

- **Nessuna registrazione pubblica esposta**: Home, Header e Login non
  contengono più link a un sign-up libero. La Home invita al login o alla
  candidatura insegnante; gli studenti sono indirizzati all'invito.
- **Ruolo admin non assegnabile dalla dropdown** di gestione utenti
  (operazione riservata, bloccata anche server-side): gli account admin sono
  mostrati come **badge in sola lettura** e non eliminabili da quella sezione.
- **Gate di stato** lato backend gestito senza assunzioni lato client: i codici
  `ACCOUNT_PENDING` / `ACCOUNT_NOT_ACTIVE` / `GOOGLE_NO_ACCOUNT` hanno messaggi
  localizzati e compaiono nel banner di errore del login.
- **Campi assenti gestiti**: per insegnanti/admin (età e classe `null`) le righe
  corrispondenti in Profilo, Dashboard e tabella utenti sono nascoste (niente
  più `classi.null` o "null anni").

---

## 6. Validazioni eseguite

- **`vite build`**: OK — 377 moduli trasformati, nessun errore (import, sintassi
  JSX/JS e wiring di tutti i nuovi file verificati end-to-end).
- **ESLint** su tutti i file nuovi/modificati di questo sprint: **0 problemi**.
- **Parità chiavi i18n** IT/EN: **320/320**, nessuna chiave orfana.
- **Audit chiavi `t()` statiche**: tutte presenti nel locale (nessun typo).

### Nota / limitazione

- In `pages/LoginPage.jsx` permane un **warning/errore ESLint pre-esistente**
  (`react-hooks/set-state-in-effect`, riga del `useEffect` su `?error=google`)
  già presente nel repository e **non introdotto da questo sprint**: quel blocco
  non è stato toccato. Il `vite build` non ne è influenzato. Si può sistemare in
  uno sprint dedicato derivando il messaggio in fase di render anziché in effect.

---

## 7. Manifest dei file

**Nuovi**
- `src/pages/TeacherRequestPage.jsx`
- `src/pages/InvitesManagementPage.jsx`
- `src/pages/AdminTeacherRequestsPage.jsx`
- `src/services/invitesService.js`
- `src/services/adminService.js`
- `src/hooks/useInviteToken.js`
- `src/hooks/useInviteRegistration.js`
- `src/hooks/useInvites.js`
- `src/hooks/useTeacherRequests.js`
- `src/features/invites/components/StudentInviteForm.jsx`
- `src/features/invites/components/TeacherInviteForm.jsx`
- `src/features/invites/components/InvitesList.jsx`
- `src/features/invites/components/InviteRow.jsx`
- `src/features/invites/components/Invites.module.css`
- `src/features/admin/components/TeacherRequestsList.jsx`
- `src/features/admin/components/TeacherRequestRow.jsx`
- `src/features/admin/components/Admin.module.css`

**Rimossi**
- `src/hooks/useRegister.js`

**Modificati**
- `src/pages/RegisterPage.jsx` (completamento su invito, token-gated)
- `src/pages/LoginPage.jsx` (rimosso link registrazione; rimando candidatura)
- `src/pages/HomePage.jsx` + `HomePage.module.css`
- `src/pages/DashboardPage.jsx` + `DashboardPage.module.css`
- `src/pages/ProfilePage.jsx` (guardie su età/classe null; badge ruolo admin)
- `src/components/layout/Header.jsx` (nav inviti/candidature; CTA candidatura)
- `src/features/users/components/UserRow.jsx` + `UserRow.module.css`
- `src/services/authService.js`
- `src/validators/authSchemas.js`
- `src/constants/domain.js`, `src/constants/routes.js`, `src/constants/queryKeys.js`
- `src/store/authStore.js`
- `src/routes/router.jsx`
- `src/locales/it/translation.json`, `src/locales/en/translation.json`
