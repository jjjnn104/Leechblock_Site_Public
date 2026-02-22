const LIFE_EXPECTANCY_YEARS = 78.5;
    const LOCALE = "de-DE";
    const UPDATE_INTERVAL_MS = 33;
    const BIRTH_STORAGE_KEY = "leechblock_birth_iso";

    const DAYS_PER_YEAR = 365.2425;
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const PERCENT_DECIMALS = 8;

    const view = {
      lifeRing: document.getElementById("life-ring"),
      birthdayRing: document.getElementById("birthday-ring"),
      yearRing: document.getElementById("year-ring"),
      dayRing: document.getElementById("day-ring"),
      lifePercent: document.getElementById("life-percent"),
      birthdayPercent: document.getElementById("birthday-percent"),
      yearPercent: document.getElementById("year-percent"),
      dayPercent: document.getElementById("day-percent"),
      yearLabel: document.getElementById("year-label"),
      lifeHint: document.getElementById("life-hint"),
      birthdayHint: document.getElementById("birthday-hint"),
      yearHint: document.getElementById("year-hint"),
      dayHint: document.getElementById("day-hint"),
      lifeNote: document.getElementById("life-note"),
      birthdayNote: document.getElementById("birthday-note"),
      error: document.getElementById("error"),
      quoteText: document.getElementById("quote-text"),
      quoteAuthor: document.getElementById("quote-author"),
      resetBirth: document.getElementById("reset-birth"),
      setupOverlay: document.getElementById("setup-overlay"),
      setupForm: document.getElementById("setup-form"),
      birthInput: document.getElementById("birth-input"),
      setupError: document.getElementById("setup-error")
    };

    const ringCircumference = 2 * Math.PI * 104;
    let timerIntervalId = null;

    function clamp01(value) {
      return Math.min(1, Math.max(0, value));
    }

    function formatPercent(fraction, decimals) {
      return `${(fraction * 100).toFixed(decimals)}%`;
    }

    function setRingProgress(circle, fraction) {
      const clamped = clamp01(fraction);
      const filled = clamped * ringCircumference;
      circle.style.strokeDasharray = `${filled} ${ringCircumference}`;
    }

    function formatDuration(ms) {
      const safe = Math.max(0, Math.floor(ms / 1000));
      const days = Math.floor(safe / 86400);
      const hours = Math.floor((safe % 86400) / 3600);
      const minutes = Math.floor((safe % 3600) / 60);
      const seconds = safe % 60;
      return `${days} T ${hours} Std ${minutes} Min ${seconds} Sek`;
    }

    function formatDate(date) {
      return new Intl.DateTimeFormat(LOCALE, {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(date);
    }

    function normalizeBirthValue(value) {
      const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(:\d{2})?$/.exec(value);
      if (!match) {
        return null;
      }
      return `${match[1]}${match[2] || ":00"}`;
    }

    function isValidBirthIso(isoString) {
      if (!isoString) {
        return false;
      }
      const birth = new Date(isoString);
      return !Number.isNaN(birth.getTime());
    }

    function loadBirthFromStorage() {
      const stored = localStorage.getItem(BIRTH_STORAGE_KEY);
      if (!isValidBirthIso(stored)) {
        return null;
      }
      return stored;
    }

    function saveBirthToStorage(isoString) {
      localStorage.setItem(BIRTH_STORAGE_KEY, isoString);
    }

    function clearBirthFromStorage() {
      localStorage.removeItem(BIRTH_STORAGE_KEY);
    }

    function showSetupOverlay(message, prefillValue) {
      view.setupError.textContent = message || "";
      view.birthInput.value = prefillValue || "";
      view.setupOverlay.style.display = "flex";
      view.birthInput.focus();
    }

    function hideSetupOverlay() {
      view.setupOverlay.style.display = "none";
      view.setupError.textContent = "";
    }

    function getRandomQuoteEntry() {
      const entries = [
        { kind: "Zitat", text: "Lost time is never found again.", author: "Benjamin Franklin" },
        { kind: "Zitat", text: "Time is what we want most, but what we use worst.", author: "William Penn" },
        { kind: "Zitat", text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
        { kind: "Zitat", text: "The key is in not spending time, but in investing it.", author: "Stephen R. Covey" },
        { kind: "Zitat", text: "The two most powerful warriors are patience and time.", author: "Leo Tolstoy" },
        { kind: "Zitat", text: "Time flies over us, but leaves its shadow behind.", author: "Nathaniel Hawthorne" },
        { kind: "Zitat", text: "Punctuality is the thief of time.", author: "Oscar Wilde" },
        { kind: "Zitat", text: "Die Zeit ist die W\u00e4hrung deines Lebens. Gib sie bewusst aus.", author: "Carl Sandburg" },
        { kind: "Impuls", text: "Du tauschst Lebenszeit gegen Aufmerksamkeit.", author: "Impuls" },
        { kind: "Impuls", text: "Was du heute aufschiebst, kommt morgen mit Zinsen zur\u00fcck.", author: "Impuls" },
        { kind: "Impuls", text: "Kleine klare Entscheidungen schlagen gro\u00dfe Vors\u00e4tze.", author: "Impuls" },
        { kind: "Impuls", text: "Die Richtung deiner Minuten formt die Richtung deiner Jahre.", author: "Impuls" }
      ];
      const index = Math.floor(Math.random() * entries.length);
      return entries[index];
    }

    function renderQuote() {
      const entry = getRandomQuoteEntry();
      view.quoteText.textContent = `"${entry.text}"`;
      view.quoteAuthor.textContent = entry.kind === "Zitat" ? `Zitat: ${entry.author}` : "Impuls";
    }

    function daysInMonth(year, monthIndex) {
      return new Date(year, monthIndex + 1, 0).getDate();
    }

    function getBirthdayForYear(birthDate, year) {
      const month = birthDate.getMonth();
      const day = Math.min(birthDate.getDate(), daysInMonth(year, month));
      return new Date(
        year,
        month,
        day,
        birthDate.getHours(),
        birthDate.getMinutes(),
        birthDate.getSeconds(),
        birthDate.getMilliseconds()
      );
    }

    function showError(message) {
      view.error.style.display = "block";
      view.error.textContent = message;

      const placeholders = [
        [view.lifePercent, "--.--%"],
        [view.birthdayPercent, "--.--%"],
        [view.yearPercent, "--.--%"],
        [view.dayPercent, "--.--%"],
        [view.lifeHint, "Konfiguration ungueltig."],
        [view.birthdayHint, "Konfiguration ungueltig."],
        [view.yearHint, "Konfiguration ungueltig."],
        [view.dayHint, "Konfiguration ungueltig."]
      ];

      placeholders.forEach(([node, text]) => {
        node.textContent = text;
      });

      [view.lifeRing, view.birthdayRing, view.yearRing, view.dayRing].forEach((ring) => {
        setRingProgress(ring, 0);
      });

      document.title = "Leechblock";
    }

    function resetTimerView() {
      const placeholders = [
        [view.lifePercent, "--.--%"],
        [view.birthdayPercent, "--.--%"],
        [view.yearPercent, "--.--%"],
        [view.dayPercent, "--.--%"],
        [view.lifeHint, "Warte auf Eingabe."],
        [view.birthdayHint, "Warte auf Eingabe."],
        [view.yearHint, "Warte auf Eingabe."],
        [view.dayHint, "Warte auf Eingabe."],
        [view.lifeNote, ""],
        [view.birthdayNote, ""]
      ];

      placeholders.forEach(([node, text]) => {
        node.textContent = text;
      });

      [view.lifeRing, view.birthdayRing, view.yearRing, view.dayRing].forEach((ring) => {
        setRingProgress(ring, 0);
      });
    }

    function startTimers(birthIso) {
      const birth = new Date(birthIso);
      if (Number.isNaN(birth.getTime())) {
        showError("Gespeichertes Geburtsdatum ist ungueltig. Bitte neu eingeben.");
        showSetupOverlay("Bitte ein gueltiges Datum eingeben.");
        return;
      }

      if (timerIntervalId !== null) {
        clearInterval(timerIntervalId);
        timerIntervalId = null;
      }

      view.error.style.display = "none";
      const lifeDurationMs = LIFE_EXPECTANCY_YEARS * DAYS_PER_YEAR * MS_PER_DAY;
      const lifeEnd = new Date(birth.getTime() + lifeDurationMs);

      view.lifeNote.textContent = `Durchschnittliche Lebenserwartung: ${LIFE_EXPECTANCY_YEARS} Jahre`;
      view.birthdayNote.textContent = `Geburt: ${formatDate(birth)}`;

      function update() {
        const now = new Date();

        const lifeFraction = clamp01((now - birth) / (lifeEnd - birth));
        const lifeRemaining = Math.max(0, lifeEnd - now);
        view.lifePercent.textContent = formatPercent(lifeFraction, PERCENT_DECIMALS);
        view.lifeHint.textContent = `Verbleibend: ${formatDuration(lifeRemaining)}`;
        setRingProgress(view.lifeRing, lifeFraction);

        const thisYearBirthday = getBirthdayForYear(birth, now.getFullYear());
        const nextYearBirthday = getBirthdayForYear(birth, now.getFullYear() + 1);

        let lastBirthday;
        let nextBirthday;

        if (now < thisYearBirthday) {
          lastBirthday = getBirthdayForYear(birth, now.getFullYear() - 1);
          nextBirthday = thisYearBirthday;
        } else {
          lastBirthday = thisYearBirthday;
          nextBirthday = nextYearBirthday;
        }

        const birthdayFraction = clamp01((now - lastBirthday) / (nextBirthday - lastBirthday));
        const birthdayRemaining = Math.max(0, nextBirthday - now);
        view.birthdayPercent.textContent = formatPercent(birthdayFraction, PERCENT_DECIMALS);
        view.birthdayHint.textContent = `Bis naechster Geburtstag: ${formatDuration(birthdayRemaining)}`;
        view.birthdayNote.textContent = `Naechster: ${formatDate(nextBirthday)}`;
        setRingProgress(view.birthdayRing, birthdayFraction);

        const yearStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        const nextYearStart = new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0, 0);
        const yearFraction = clamp01((now - yearStart) / (nextYearStart - yearStart));
        const yearRemaining = Math.max(0, nextYearStart - now);

        view.yearPercent.textContent = formatPercent(yearFraction, PERCENT_DECIMALS);
        view.yearLabel.textContent = String(now.getFullYear());
        view.yearHint.textContent = `Bis Jahresende: ${formatDuration(yearRemaining)}`;
        setRingProgress(view.yearRing, yearFraction);

        const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const nextDayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
        const dayFraction = clamp01((now - dayStart) / (nextDayStart - dayStart));
        const dayRemaining = Math.max(0, nextDayStart - now);

        view.dayPercent.textContent = formatPercent(dayFraction, PERCENT_DECIMALS);
        view.dayHint.textContent = `Bis Tagesende: ${formatDuration(dayRemaining)}`;
        setRingProgress(view.dayRing, dayFraction);
      }

      update();
      timerIntervalId = setInterval(update, UPDATE_INTERVAL_MS);
      document.title = "Leechblock";
    }

    function bootstrap() {
      renderQuote();
      resetTimerView();
      view.yearLabel.textContent = String(new Date().getFullYear());

      view.setupForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const normalized = normalizeBirthValue(view.birthInput.value.trim());
        if (!normalized || !isValidBirthIso(normalized)) {
          showSetupOverlay("Bitte ein gueltiges Datum und eine Uhrzeit eingeben.", view.birthInput.value);
          return;
        }

        saveBirthToStorage(normalized);
        hideSetupOverlay();
        startTimers(normalized);
      });

      view.resetBirth.addEventListener("click", () => {
        const shouldReset = confirm("Gespeichertes Geburtsdatum loeschen und neu eingeben?");
        if (!shouldReset) {
          return;
        }

        clearBirthFromStorage();
        resetTimerView();

        if (timerIntervalId !== null) {
          clearInterval(timerIntervalId);
          timerIntervalId = null;
        }

        showSetupOverlay("Bitte neues Geburtsdatum eingeben.");
      });

      const storedBirth = loadBirthFromStorage();
      if (storedBirth) {
        hideSetupOverlay();
        startTimers(storedBirth);
      } else {
        showSetupOverlay("Kein Geburtsdatum gespeichert.");
      }
    }

    bootstrap();

