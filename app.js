(() => {
  const STORAGE_KEY = "study-progress-tracker:v1";
  const DAY = 24 * 60 * 60 * 1000;
  const EMPTY_DATA = {
    version: 1,
    streak: { count: 0, lastStudyDate: null },
    recent: [],
    subjects: []
  };
  const DEFAULT_FOCUS = {
    pomodoro: {
      settings: {
        workMinutes: 50,
        shortBreakMinutes: 10,
        longBreakMinutes: 20,
        sessionsBeforeLongBreak: 4,
        sound: false,
        notifications: false,
        autoStart: false
      },
      stats: {
        completedSessions: 0
      }
    },
    planner: {
      date: "",
      tasks: []
    }
  };

  const firebaseConfig = {
    apiKey: "AIzaSyDuCZskv_60ZvBhjPVAzwOj80Vsgb8lLX0",
    authDomain: "study-tracker-19314.firebaseapp.com",
    projectId: "study-tracker-19314",
    storageBucket: "study-tracker-19314.firebasestorage.app",
    messagingSenderId: "899168558348",
    appId: "1:899168558348:web:5790424c73786c1cf4fd29"
  };

  const els = {
    sidebar: document.getElementById("sidebar"),
    menuToggle: document.getElementById("menuToggle"),
    navItems: [...document.querySelectorAll(".nav-item")],
    views: {
      dashboard: document.getElementById("dashboardView"),
      subjects: document.getElementById("subjectsView"),
      subjectDetail: document.getElementById("subjectDetailView"),
      focus: document.getElementById("focusView"),
      settings: document.getElementById("settingsView")
    },
    viewEyebrow: document.getElementById("viewEyebrow"),
    viewTitle: document.getElementById("viewTitle"),
    statsGrid: document.getElementById("statsGrid"),
    overallPercent: document.getElementById("overallPercent"),
    overallCaption: document.getElementById("overallCaption"),
    overallBar: document.getElementById("overallBar"),
    overallRing: document.getElementById("overallRing"),
    overallRingText: document.getElementById("overallRingText"),
    recentList: document.getElementById("recentList"),
    snapshotList: document.getElementById("snapshotList"),
    subjectGrid: document.getElementById("subjectGrid"),
    subjectDetailShell: document.getElementById("subjectDetailShell"),
    globalSearch: document.getElementById("globalSearch"),
    filterBtns: [...document.querySelectorAll(".filter-btn")],
    newSubjectBtn: document.getElementById("newSubjectBtn"),
    quickTopicBtn: document.getElementById("quickTopicBtn"),
    quickSubtopicBtn: document.getElementById("quickSubtopicBtn"),
    exportBtn: document.getElementById("exportBtn"),
    importInput: document.getElementById("importInput"),
    loadSampleBtn: document.getElementById("loadSampleBtn"),
    resetAllBtn: document.getElementById("resetAllBtn"),
    streakCount: document.getElementById("streakCount"),
    syncStatus: document.getElementById("syncStatus"),
    syncStatusText: document.getElementById("syncStatusText"),
    profileCard: document.getElementById("profileCard"),
    signInBtn: document.getElementById("signInBtn"),
    signOutBtn: document.getElementById("signOutBtn"),
    settingsSignInBtn: document.getElementById("settingsSignInBtn"),
    settingsSignOutBtn: document.getElementById("settingsSignOutBtn"),
    cloudHelpText: document.getElementById("cloudHelpText"),
    timerModeLabel: document.getElementById("timerModeLabel"),
    pomodoroSessions: document.getElementById("pomodoroSessions"),
    timerDisplay: document.getElementById("timerDisplay"),
    timerStartBtn: document.getElementById("timerStartBtn"),
    timerPauseBtn: document.getElementById("timerPauseBtn"),
    timerResumeBtn: document.getElementById("timerResumeBtn"),
    timerResetBtn: document.getElementById("timerResetBtn"),
    workDurationInput: document.getElementById("workDurationInput"),
    shortBreakInput: document.getElementById("shortBreakInput"),
    longBreakInput: document.getElementById("longBreakInput"),
    sessionsBeforeLongInput: document.getElementById("sessionsBeforeLongInput"),
    soundToggle: document.getElementById("soundToggle"),
    notificationToggle: document.getElementById("notificationToggle"),
    autoStartToggle: document.getElementById("autoStartToggle"),
    taskForm: document.getElementById("taskForm"),
    taskInput: document.getElementById("taskInput"),
    taskList: document.getElementById("taskList"),
    taskCountText: document.getElementById("taskCountText"),
    taskPercentText: document.getElementById("taskPercentText"),
    taskProgressBar: document.getElementById("taskProgressBar"),
    modal: document.getElementById("entityModal"),
    form: document.getElementById("entityForm"),
    modalTitle: document.getElementById("modalTitle"),
    entityName: document.getElementById("entityName"),
    entityIcon: document.getElementById("entityIcon"),
    entityColor: document.getElementById("entityColor"),
    entityIconField: document.getElementById("entityIconField"),
    entityColorField: document.getElementById("entityColorField"),
    closeModal: document.getElementById("closeModal"),
    cancelModal: document.getElementById("cancelModal"),
    toastRegion: document.getElementById("toastRegion"),
    confettiLayer: document.getElementById("confettiLayer")
  };

  const state = {
    data: loadData(),
    view: "dashboard",
    filter: "all",
    search: "",
    selectedSubjectId: null,
    expandedTopics: new Set(),
    modal: null,
    draggedTopic: null,
    draggedSubtopic: null,
    draggedTaskId: null,
    timer: {
      mode: "work",
      remaining: 0,
      running: false,
      intervalId: null
    },
    localRevision: 0
  };

  const cloud = {
    enabled: false,
    auth: null,
    db: null,
    user: null,
    ready: false,
    applyingRemote: false,
    syncTimer: null,
    syncInFlight: false,
    pendingSync: false,
    authToken: 0,
    lastSyncedRevision: 0
  };

  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function sampleData() {
    const buildSubject = (name, icon, topics) => ({
      id: uid("subject"),
      name,
      icon,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      topics: topics.map(([topicName, color, subtopics]) => ({
        id: uid("topic"),
        name: topicName,
        color,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        subtopics: subtopics.map((name, index) => ({
          id: uid("subtopic"),
          name,
          completed: index % 4 === 0,
          updatedAt: Date.now()
        }))
      }))
    });

    return {
      version: 1,
      streak: { count: 0, lastStudyDate: null },
      recent: [],
      subjects: [
        buildSubject("Mathematics", "M", [
          ["P1", "#3B82F6", ["Quadratics", "Functions", "Trigonometry", "Coordinate Geometry"]],
          ["P3", "#14B8A6", ["Functions", "Integration", "Differential Equations", "Numerical Methods"]],
          ["Statistics", "#F59E0B", ["Probability", "Permutations & Combinations", "Hypothesis Testing"]]
        ]),
        buildSubject("Biology", "B", [
          ["Cell Structure", "#22C55E", ["Microscopy", "Organelles", "Cell Membranes"]],
          ["Transport", "#06B6D4", ["Diffusion", "Osmosis", "Active Transport", "Mass Flow"]],
          ["Enzymes", "#A855F7", ["Enzyme Action", "Factors Affecting Rate", "Inhibitors"]],
          ["Genetics", "#F97316", ["DNA", "Protein Synthesis", "Inheritance"]]
        ]),
        buildSubject("Chemistry", "C", [
          ["Physical Chemistry", "#60A5FA", ["Atomic Structure", "Energetics", "Equilibria"]],
          ["Organic Chemistry", "#34D399", ["Alkanes", "Alkenes", "Alcohols", "Carbonyls"]],
          ["Inorganic Chemistry", "#FBBF24", ["Periodicity", "Group 2", "Group 17"]]
        ])
      ]
    };
  }

  function loadData() {
    const fallbackToDemo = () => normalizeData(sampleData());
    const fallbackToEmpty = () => normalizeData(EMPTY_DATA);

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) return fallbackToDemo();

      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.subjects)) return fallbackToEmpty();

      return normalizeData(parsed);
    } catch {
      return fallbackToEmpty();
    }
  }

  function normalizeData(data) {
    const source = data && typeof data === "object" ? data : EMPTY_DATA;
    return {
      version: 1,
      streak: source.streak || { count: 0, lastStudyDate: null },
      recent: Array.isArray(source.recent) ? source.recent.slice(0, 12) : [],
      subjects: (source.subjects || []).map(subject => ({
        id: subject.id || uid("subject"),
        name: subject.name || "Untitled Subject",
        icon: subject.icon || subject.name?.charAt(0)?.toUpperCase() || "S",
        createdAt: subject.createdAt || Date.now(),
        updatedAt: subject.updatedAt || Date.now(),
        topics: (subject.topics || []).map(topic => ({
          id: topic.id || uid("topic"),
          name: topic.name || "Untitled Topic",
          color: topic.color || "#3B82F6",
          createdAt: topic.createdAt || Date.now(),
          updatedAt: topic.updatedAt || Date.now(),
          subtopics: (topic.subtopics || []).map(subtopic => ({
            id: subtopic.id || uid("subtopic"),
            name: subtopic.name || "Untitled Subtopic",
            completed: Boolean(subtopic.completed),
            updatedAt: subtopic.updatedAt || Date.now()
          }))
        }))
      })),
      focus: normalizeFocus(source.focus)
    };
  }

  function normalizeFocus(focus) {
    const source = focus && typeof focus === "object" ? focus : {};
    const pomodoro = source.pomodoro && typeof source.pomodoro === "object" ? source.pomodoro : {};
    const settings = pomodoro.settings && typeof pomodoro.settings === "object" ? pomodoro.settings : {};
    const stats = pomodoro.stats && typeof pomodoro.stats === "object" ? pomodoro.stats : {};
    const planner = source.planner && typeof source.planner === "object" ? source.planner : {};
    const defaultSettings = DEFAULT_FOCUS.pomodoro.settings;

    return {
      pomodoro: {
        settings: {
          workMinutes: clampNumber(settings.workMinutes, defaultSettings.workMinutes, 1, 180),
          shortBreakMinutes: clampNumber(settings.shortBreakMinutes, defaultSettings.shortBreakMinutes, 1, 90),
          longBreakMinutes: clampNumber(settings.longBreakMinutes, defaultSettings.longBreakMinutes, 1, 180),
          sessionsBeforeLongBreak: clampNumber(settings.sessionsBeforeLongBreak, defaultSettings.sessionsBeforeLongBreak, 1, 12),
          sound: Boolean(settings.sound),
          notifications: Boolean(settings.notifications),
          autoStart: Boolean(settings.autoStart)
        },
        stats: {
          completedSessions: Math.max(0, Number(stats.completedSessions) || 0)
        }
      },
      planner: {
        date: planner.date || todayKey(),
        tasks: normalizeTasks(planner.date === todayKey() ? planner.tasks : [])
      }
    };
  }

  function normalizeTasks(tasks) {
    return Array.isArray(tasks) ? tasks.map(task => ({
      id: task.id || uid("task"),
      text: task.text || "Untitled task",
      completed: Boolean(task.completed),
      createdAt: task.createdAt || Date.now(),
      updatedAt: task.updatedAt || Date.now()
    })) : [];
  }

  function clampNumber(value, fallback, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, Math.round(number)));
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeData(state.data)));
    } catch {
      toast("Progress could not be saved in this browser.");
    }
  }

  function mutate(message, fn) {
    const beforeComplete = new Map(state.data.subjects.map(subject => [subject.id, subjectStats(subject).percent]));
    fn();
    state.data = normalizeData(state.data);
    state.localRevision += 1;
    saveData();
    render();
    scheduleCloudSync();
    if (message) toast(message);
    for (const subject of state.data.subjects) {
      const previous = beforeComplete.get(subject.id) || 0;
      const current = subjectStats(subject).percent;
      if (previous < 100 && current === 100) showConfetti();
    }
  }

  function initFirebase() {
    if (!window.firebase?.initializeApp) {
      setSyncStatus("offline", "Local only");
      return;
    }

    try {
      firebase.initializeApp(firebaseConfig);
      cloud.auth = firebase.auth();
      cloud.db = firebase.firestore();
      cloud.enabled = true;
      cloud.auth.onAuthStateChanged(handleAuthStateChange);
      setSyncStatus(navigator.onLine ? "offline" : "offline", "Offline");
    } catch (error) {
      console.error(error);
      setSyncStatus("error", "Firebase unavailable");
      toast("Firebase could not be initialized.");
    }
  }

  async function handleAuthStateChange(user) {
    const token = ++cloud.authToken;
    cloud.user = user;
    cloud.ready = false;
    clearTimeout(cloud.syncTimer);
    cloud.pendingSync = false;
    renderAuth();

    if (!user) {
      cloud.lastSyncedRevision = state.localRevision;
      setSyncStatus(navigator.onLine ? "offline" : "offline", "Offline");
      renderAuth();
      return;
    }

    setSyncStatus("syncing", "Checking cloud...");

    try {
      const docRef = userDocRef();
      const snap = await docRef.get();
      if (token !== cloud.authToken) return;

      if (snap.exists && isValidCloudData(snap.data())) {
        cloud.applyingRemote = true;
        state.data = normalizeData(snap.data());
        state.localRevision += 1;
        saveData();
        cloud.applyingRemote = false;
        cloud.ready = true;
        cloud.lastSyncedRevision = state.localRevision;
        render();
        setSyncStatus("synced", "Synced");
        toast("Cloud tracker loaded.");
      } else {
        cloud.ready = true;
        await performCloudSync({ force: true, reason: "initial-upload" });
        toast("Local tracker uploaded to your account.");
      }
    } catch (error) {
      console.error(error);
      cloud.ready = false;
      setSyncStatus("error", "Sync failed");
      toast("Could not check Firestore. Local backup is still saved.");
    } finally {
      cloud.applyingRemote = false;
      renderAuth();
    }
  }

  function isValidCloudData(data) {
    return data && Array.isArray(data.subjects);
  }

  function userDocRef() {
    if (!cloud.user || !cloud.db) return null;
    return cloud.db.collection("users").doc(cloud.user.uid);
  }

  function userProfile(user = cloud.user) {
    if (!user) return null;
    return {
      uid: user.uid,
      displayName: user.displayName || "",
      email: user.email || "",
      photoURL: user.photoURL || ""
    };
  }

  function cloudPayload() {
    return {
      ...normalizeData(state.data),
      profile: userProfile(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
  }

  function scheduleCloudSync() {
    if (!cloud.enabled || !cloud.user || !cloud.ready || cloud.applyingRemote) return;
    clearTimeout(cloud.syncTimer);
    cloud.syncTimer = setTimeout(() => {
      performCloudSync({ reason: "change" });
    }, 500);
  }

  async function performCloudSync({ force = false, reason = "change" } = {}) {
    if (!cloud.enabled || !cloud.user || !cloud.ready || cloud.applyingRemote) return;
    if (cloud.syncInFlight) {
      cloud.pendingSync = true;
      return;
    }
    if (!force && state.localRevision === cloud.lastSyncedRevision) return;

    const writeRevision = state.localRevision;
    cloud.syncInFlight = true;
    cloud.pendingSync = false;
    setSyncStatus("syncing", reason === "initial-upload" ? "Uploading..." : "Syncing...");

    try {
      await userDocRef().set(cloudPayload(), { merge: false });
      cloud.lastSyncedRevision = writeRevision;
      setSyncStatus("synced", "Synced");
    } catch (error) {
      console.error(error);
      cloud.pendingSync = true;
      setSyncStatus(navigator.onLine ? "error" : "offline", navigator.onLine ? "Sync failed" : "Offline");
    } finally {
      cloud.syncInFlight = false;
      if (cloud.pendingSync || state.localRevision !== cloud.lastSyncedRevision) {
        cloud.pendingSync = false;
        scheduleCloudSync();
      }
    }
  }

  async function signInWithGoogle() {
    if (!cloud.enabled) {
      toast("Firebase is not available on this page.");
      return;
    }
    try {
      setSyncStatus("syncing", "Signing in...");
      const provider = new firebase.auth.GoogleAuthProvider();
      await cloud.auth.signInWithPopup(provider);
    } catch (error) {
      console.error(error);
      setSyncStatus("error", "Sign-in failed");
      toast("Google sign-in was not completed.");
    }
  }

  async function signOut() {
    if (!cloud.enabled) return;
    try {
      await performCloudSync({ force: true, reason: "sign-out" });
      await cloud.auth.signOut();
      toast("Signed out. Local backup remains available.");
    } catch (error) {
      console.error(error);
      toast("Could not sign out. Please try again.");
    }
  }

  function setSyncStatus(status, text) {
    els.syncStatus.dataset.status = status;
    els.syncStatusText.textContent = text;
  }

  function renderAuth() {
    const user = cloud.user;
    const signedIn = Boolean(user);
    els.signInBtn.classList.toggle("hidden", signedIn);
    els.settingsSignInBtn.classList.toggle("hidden", signedIn);
    els.signOutBtn.classList.toggle("hidden", !signedIn);
    els.settingsSignOutBtn.classList.toggle("hidden", !signedIn);

    if (signedIn) {
      const name = user.displayName || "Google user";
      const email = user.email || "No email available";
      const photo = user.photoURL
        ? `<img src="${escapeHtml(user.photoURL)}" alt="">`
        : `<div class="subject-icon">${escapeHtml(name.charAt(0).toUpperCase())}</div>`;
      els.profileCard.classList.remove("signed-out");
      els.profileCard.innerHTML = `
        ${photo}
        <div class="profile-copy">
          <strong>${escapeHtml(name)}</strong>
          <span>${escapeHtml(email)}</span>
        </div>
      `;
      els.cloudHelpText.textContent = `Signed in as ${email}. Your tracker is isolated under users/${user.uid}.`;
    } else {
      els.profileCard.classList.add("signed-out");
      els.profileCard.innerHTML = `
        <div class="profile-copy">
          <strong>Not signed in</strong>
          <span>Local backup active</span>
        </div>
      `;
      els.cloudHelpText.textContent = "Sign in to sync this tracker across your devices.";
    }
  }

  function touchSubject(subject) {
    subject.updatedAt = Date.now();
  }

  function touchTopic(subject, topic) {
    topic.updatedAt = Date.now();
    touchSubject(subject);
  }

  function addRecent(text, detail) {
    state.data.recent.unshift({ id: uid("activity"), text, detail, at: Date.now() });
    state.data.recent = state.data.recent.slice(0, 12);
  }

  function updateStreak() {
    const today = todayKey();
    const streak = state.data.streak || { count: 0, lastStudyDate: null };
    if (streak.lastStudyDate === today) return;
    const last = streak.lastStudyDate ? new Date(`${streak.lastStudyDate}T00:00:00`).getTime() : 0;
    const todayTime = new Date(`${today}T00:00:00`).getTime();
    streak.count = todayTime - last === DAY ? streak.count + 1 : 1;
    streak.lastStudyDate = today;
    state.data.streak = streak;
  }

  function topicStats(topic) {
    const total = topic.subtopics.length;
    const completed = topic.subtopics.filter(subtopic => subtopic.completed).length;
    return {
      total,
      completed,
      percent: total ? Math.round((completed / total) * 100) : 0,
      isComplete: total > 0 && completed === total
    };
  }

  function subjectStats(subject) {
    const total = subject.topics.length;
    const completed = subject.topics.filter(topic => topicStats(topic).isComplete).length;
    return {
      total,
      completed,
      percent: total ? Math.round((completed / total) * 100) : 0,
      isComplete: total > 0 && completed === total
    };
  }

  function appStats() {
    const subjects = state.data.subjects.length;
    const topics = state.data.subjects.flatMap(subject => subject.topics);
    const subtopics = topics.flatMap(topic => topic.subtopics);
    const completedTopics = topics.filter(topic => topicStats(topic).isComplete).length;
    const completedSubtopics = subtopics.filter(subtopic => subtopic.completed).length;
    const overall = subtopics.length ? Math.round((completedSubtopics / subtopics.length) * 100) : 0;
    return {
      subjects,
      topics: topics.length,
      completedTopics,
      subtopics: subtopics.length,
      completedSubtopics,
      overall
    };
  }

  function findSubject(id) {
    return state.data.subjects.find(subject => subject.id === id);
  }

  function findTopic(subjectId, topicId) {
    const subject = findSubject(subjectId);
    return subject ? subject.topics.find(topic => topic.id === topicId) : null;
  }

  function findSubtopic(subjectId, topicId, subtopicId) {
    const topic = findTopic(subjectId, topicId);
    return topic ? topic.subtopics.find(subtopic => subtopic.id === subtopicId) : null;
  }

  function matchesFilter(percent, hasItems) {
    if (state.filter === "completed") return hasItems && percent === 100;
    if (state.filter === "incomplete") return !hasItems || percent < 100;
    return true;
  }

  function searchableSubject(subject) {
    const query = state.search.trim().toLowerCase();
    if (!query) return true;
    return [
      subject.name,
      ...subject.topics.map(topic => topic.name),
      ...subject.topics.flatMap(topic => topic.subtopics.map(subtopic => subtopic.name))
    ].join(" ").toLowerCase().includes(query);
  }

  function render() {
    renderNavigation();
    renderDashboard();
    renderSubjects();
    renderSubjectDetail();
    renderFocus();
    renderAuth();
    els.streakCount.textContent = state.data.streak?.count || 0;
  }

  function renderNavigation() {
    const titles = {
      dashboard: ["Dashboard", "Exam Preparation Overview"],
      subjects: ["Subjects", "Syllabus Workspace"],
      subjectDetail: ["Subjects", selectedSubjectTitle()],
      focus: ["Focus", "Timer and Daily Planner"],
      settings: ["Settings", "Backup and Preferences"]
    };
    els.navItems.forEach(item => {
      const active = item.dataset.view === state.view || (state.view === "subjectDetail" && item.dataset.view === "subjects");
      item.classList.toggle("active", active);
    });
    Object.entries(els.views).forEach(([view, element]) => element.classList.toggle("active", view === state.view));
    els.viewEyebrow.textContent = titles[state.view][0];
    els.viewTitle.textContent = titles[state.view][1];
  }

  function selectedSubjectTitle() {
    const subject = findSubject(state.selectedSubjectId);
    return subject ? subject.name : "Subject Workspace";
  }

  function renderDashboard() {
    const stats = appStats();
    const cards = [
      ["Subjects", stats.subjects],
      ["Topics", stats.topics],
      ["Completed Topics", stats.completedTopics],
      ["Subtopics", stats.subtopics],
      ["Completed Subtopics", stats.completedSubtopics],
      ["Overall Progress", `${stats.overall}%`]
    ];
    els.statsGrid.innerHTML = cards.map(([label, value]) => `
      <article class="stat-card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(String(value))}</strong>
      </article>
    `).join("");

    els.overallPercent.textContent = `${stats.overall}%`;
    els.overallRingText.textContent = `${stats.overall}%`;
    els.overallBar.style.width = `${stats.overall}%`;
    els.overallRing.style.strokeDashoffset = String(314 - (314 * stats.overall) / 100);
    els.overallCaption.textContent = stats.subtopics
      ? `${stats.completedSubtopics} of ${stats.subtopics} subtopics complete across your full tracker.`
      : "Add subjects, topics, and subtopics to begin tracking.";

    els.recentList.innerHTML = state.data.recent.length
      ? state.data.recent.map(item => `
        <div class="activity-item">
          <strong>${escapeHtml(item.text)}</strong>
          <span>${escapeHtml(item.detail)} · ${escapeHtml(timeAgo(item.at))}</span>
        </div>
      `).join("")
      : `<div class="empty-state">No recent study activity yet.</div>`;

    els.snapshotList.innerHTML = state.data.subjects.length
      ? state.data.subjects.map(subject => {
        const stats = subjectStats(subject);
        return `
          <div class="snapshot-item">
            <strong>${escapeHtml(subject.icon)} ${escapeHtml(subject.name)}</strong>
            <span>${stats.completed} / ${stats.total} topics complete · ${stats.percent}%</span>
            <div class="progress-track"><div class="progress-fill" style="width:${stats.percent}%"></div></div>
          </div>
        `;
      }).join("")
      : `<div class="empty-state">Your subjects will appear here.</div>`;
  }

  function renderSubjects() {
    const subjects = state.data.subjects.filter(subject => {
      const stats = subjectStats(subject);
      return searchableSubject(subject) && matchesFilter(stats.percent, stats.total > 0);
    });

    els.subjectGrid.innerHTML = subjects.length
      ? subjects.map(renderSubjectCard).join("")
      : `<div class="empty-state">No subjects match this view.</div>`;
  }

  function renderSubjectCard(subject) {
    const stats = subjectStats(subject);
    return `
      <article class="subject-card subject-summary-card ${stats.isComplete ? "completed" : ""}" data-subject-id="${subject.id}" data-action="open-subject" tabindex="0" role="button">
        <div class="subject-head">
          <div class="subject-title">
            <div class="subject-icon">${escapeHtml(subject.icon || subject.name.charAt(0).toUpperCase())}</div>
            <div>
              <h3>${escapeHtml(subject.name)}</h3>
              <span class="status-badge ${stats.isComplete ? "done" : ""}">${stats.isComplete ? "Completed" : "In Progress"}</span>
            </div>
          </div>
          <strong class="subject-percent">${stats.percent}%</strong>
        </div>
        <div class="subject-meta">
          <span>${stats.completed} / ${stats.total} Topics Complete</span>
          <span>${subject.topics.length} total topics</span>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${stats.percent}%"></div></div>
      </article>
    `;
    const topics = subject.topics.filter(topic => {
      const query = state.search.trim().toLowerCase();
      const topicMatch = !query || [
        subject.name,
        topic.name,
        ...topic.subtopics.map(subtopic => subtopic.name)
      ].join(" ").toLowerCase().includes(query);
      const tStats = topicStats(topic);
      return topicMatch && matchesFilter(tStats.percent, tStats.total > 0);
    });

    return `
      <article class="subject-card ${stats.isComplete ? "completed" : ""}" data-subject-id="${subject.id}">
        <div class="subject-head">
          <div class="subject-title">
            <div class="subject-icon">${escapeHtml(subject.icon || subject.name.charAt(0).toUpperCase())}</div>
            <div>
              <h3>${escapeHtml(subject.name)}</h3>
              <span class="status-badge ${stats.isComplete ? "done" : ""}">${stats.isComplete ? "✓ Completed" : "In Progress"}</span>
            </div>
          </div>
          <div class="subject-actions">
            <button class="mini-btn" data-action="add-topic" type="button">+ Topic</button>
            <button class="mini-btn" data-action="duplicate-subject" type="button">Duplicate</button>
            <button class="mini-btn" data-action="edit-subject" type="button">Edit</button>
            <button class="mini-btn" data-action="delete-subject" type="button">Delete</button>
          </div>
        </div>
        <div class="subject-meta">
          <span>${stats.completed} / ${stats.total} Topics Complete</span>
          <strong>${stats.percent}%</strong>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${stats.percent}%"></div></div>
        <div class="subject-body">
          <div class="topic-list" data-topic-list="${subject.id}">
            ${topics.length ? topics.map(topic => renderTopicCard(subject, topic)).join("") : `<div class="empty-state">No topics match this subject view.</div>`}
          </div>
        </div>
      </article>
    `;
  }

  function renderSubjectDetail() {
    const subject = findSubject(state.selectedSubjectId);
    if (!subject) {
      els.subjectDetailShell.innerHTML = `
        <section class="glass-panel">
          <p class="panel-kicker">Subject Workspace</p>
          <h3>No subject selected</h3>
          <p class="muted">Choose a subject to view topics, subtopics, and checklists.</p>
          <button class="primary-btn" data-action="back-to-subjects" type="button">Back to Subjects</button>
        </section>
      `;
      return;
    }

    const stats = subjectStats(subject);
    els.subjectDetailShell.innerHTML = `
      <section class="glass-panel detail-hero" data-subject-id="${subject.id}">
        <div class="detail-title">
          <button class="ghost-btn" data-action="back-to-subjects" type="button">Back</button>
          <div class="subject-icon large">${escapeHtml(subject.icon || subject.name.charAt(0).toUpperCase())}</div>
          <div>
            <p class="panel-kicker">Subject Workspace</p>
            <h3>${escapeHtml(subject.name)}</h3>
            <p class="muted">${stats.completed} of ${stats.total} topics complete.</p>
          </div>
        </div>
        <div class="detail-actions">
          <button class="mini-btn" data-action="add-topic" type="button">+ Topic</button>
          <button class="mini-btn" data-action="duplicate-subject" type="button">Duplicate</button>
          <button class="mini-btn" data-action="edit-subject" type="button">Edit</button>
          <button class="mini-btn" data-action="delete-subject" type="button">Delete</button>
        </div>
        <div class="detail-progress">
          <strong>${stats.percent}%</strong>
          <div class="progress-track"><div class="progress-fill" style="width:${stats.percent}%"></div></div>
        </div>
      </section>
      <section class="subject-body detail-topics" data-subject-id="${subject.id}">
        <div class="topic-list" data-topic-list="${subject.id}">
          ${subject.topics.length ? subject.topics.map(topic => renderTopicCard(subject, topic)).join("") : `<div class="empty-state">No topics yet. Add one to start building this subject.</div>`}
        </div>
      </section>
    `;
  }

  function renderTopicCard(subject, topic) {
    const stats = topicStats(topic);
    const isExpanded = state.expandedTopics.has(topic.id);
    const query = state.search.trim().toLowerCase();
    const subtopics = topic.subtopics.filter(subtopic => !query || [
      subject.name,
      topic.name,
      subtopic.name
    ].join(" ").toLowerCase().includes(query));

    return `
      <article class="topic-card ${stats.isComplete ? "completed" : ""}" data-subject-id="${subject.id}" data-topic-id="${topic.id}" draggable="true">
        <div class="topic-head" data-action="toggle-topic">
          <div class="topic-title">
            <span class="tag" style="border-color:${escapeHtml(topic.color)}; color:${escapeHtml(topic.color)}">${escapeHtml(topic.name)}</span>
            <span class="status-badge ${stats.isComplete ? "done" : ""}">${stats.isComplete ? "✓ Complete" : `${stats.percent}%`}</span>
          </div>
          <div class="topic-actions">
            <button class="mini-btn" data-action="add-subtopic" type="button">+ Subtopic</button>
            <button class="mini-btn" data-action="quick-complete-topic" type="button">Complete</button>
            <button class="mini-btn" data-action="mark-all" type="button">Mark All</button>
            <button class="mini-btn" data-action="reset-topic" type="button">Reset</button>
            <button class="mini-btn" data-action="duplicate-topic" type="button">Duplicate</button>
            <button class="mini-btn" data-action="edit-topic" type="button">Edit</button>
            <button class="mini-btn" data-action="delete-topic" type="button">Delete</button>
          </div>
        </div>
        <div class="topic-meta">
          <span>${stats.completed} / ${stats.total} Subtopics Complete</span>
          <strong>${stats.percent}%</strong>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${stats.percent}%"></div></div>
        <div class="topic-content ${isExpanded ? "" : "collapsed"}">
          <div class="topic-inner">
            <div class="subtopic-list" data-subtopic-list="${topic.id}">
              ${subtopics.length ? subtopics.map(subtopic => renderSubtopic(subject, topic, subtopic)).join("") : `<div class="empty-state">No subtopics yet.</div>`}
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function renderSubtopic(subject, topic, subtopic) {
    return `
      <div class="subtopic-item ${subtopic.completed ? "completed" : ""}" data-subject-id="${subject.id}" data-topic-id="${topic.id}" data-subtopic-id="${subtopic.id}" draggable="true">
        <label class="check-wrap">
          <input type="checkbox" data-action="toggle-subtopic" ${subtopic.completed ? "checked" : ""}>
          <span class="fake-check">✓</span>
        </label>
        <div class="subtopic-name">${escapeHtml(subtopic.name)}</div>
        <div class="sub-actions">
          <button class="mini-btn" data-action="edit-subtopic" type="button">Edit</button>
          <button class="mini-btn" data-action="delete-subtopic" type="button">Delete</button>
        </div>
      </div>
    `;
  }

  function openEntityModal(config) {
    state.modal = config;
    els.modalTitle.textContent = config.title;
    els.entityName.value = config.name || "";
    els.entityIcon.value = config.icon || "";
    els.entityColor.value = config.color || "#3B82F6";
    els.entityIconField.style.display = config.type === "subject" ? "grid" : "none";
    els.entityColorField.style.display = config.type === "topic" ? "grid" : "none";
    els.modal.showModal();
    requestAnimationFrame(() => els.entityName.focus());
  }

  function closeModal() {
    els.modal.close();
    state.modal = null;
    els.form.reset();
  }

  function createSubject() {
    openEntityModal({ mode: "create", type: "subject", title: "New Subject", icon: "S" });
  }

  function createTopic(subjectId) {
    const subject = subjectId ? findSubject(subjectId) : findSubject(state.selectedSubjectId) || state.data.subjects[0];
    if (!subject) return toast("Create a subject first.");
    openEntityModal({ mode: "create", type: "topic", title: `New Topic in ${subject.name}`, subjectId: subject.id });
  }

  function createSubtopic(subjectId, topicId) {
    const subject = subjectId ? findSubject(subjectId) : findSubject(state.selectedSubjectId) || state.data.subjects[0];
    const topic = topicId ? findTopic(subjectId, topicId) : subject?.topics[0];
    if (!subject || !topic) return toast("Create a topic first.");
    openEntityModal({ mode: "create", type: "subtopic", title: `New Subtopic in ${topic.name}`, subjectId: subject.id, topicId: topic.id });
  }

  function handleModalSubmit(event) {
    event.preventDefault();
    const config = state.modal;
    const name = els.entityName.value.trim();
    if (!config || !name) return;
    const icon = els.entityIcon.value.trim() || name.charAt(0).toUpperCase();
    const color = els.entityColor.value;

    mutate("Saved.", () => {
      if (config.type === "subject") {
        if (config.mode === "edit") {
          const subject = findSubject(config.subjectId);
          subject.name = name;
          subject.icon = icon;
          touchSubject(subject);
          addRecent("Subject updated", name);
        } else {
          state.data.subjects.push({
            id: uid("subject"),
            name,
            icon,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            topics: []
          });
          addRecent("Subject created", name);
        }
      }

      if (config.type === "topic") {
        const subject = findSubject(config.subjectId);
        if (config.mode === "edit") {
          const topic = findTopic(config.subjectId, config.topicId);
          topic.name = name;
          topic.color = color;
          touchTopic(subject, topic);
          addRecent("Topic updated", `${subject.name} · ${name}`);
        } else {
          const topic = {
            id: uid("topic"),
            name,
            color,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            subtopics: []
          };
          subject.topics.push(topic);
          state.expandedTopics.add(topic.id);
          touchSubject(subject);
          addRecent("Topic created", `${subject.name} · ${name}`);
        }
      }

      if (config.type === "subtopic") {
        const subject = findSubject(config.subjectId);
        const topic = findTopic(config.subjectId, config.topicId);
        if (config.mode === "edit") {
          const subtopic = findSubtopic(config.subjectId, config.topicId, config.subtopicId);
          subtopic.name = name;
          subtopic.updatedAt = Date.now();
          touchTopic(subject, topic);
          addRecent("Subtopic updated", `${topic.name} · ${name}`);
        } else {
          topic.subtopics.push({ id: uid("subtopic"), name, completed: false, updatedAt: Date.now() });
          state.expandedTopics.add(topic.id);
          touchTopic(subject, topic);
          addRecent("Subtopic created", `${topic.name} · ${name}`);
        }
      }
    });
    closeModal();
  }

  function handleClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "toggle-subtopic") return;
    const subjectEl = button.closest("[data-subject-id]");
    const topicEl = button.closest("[data-topic-id]");
    const subtopicEl = button.closest("[data-subtopic-id]");
    const subjectId = subjectEl?.dataset.subjectId;
    const topicId = topicEl?.dataset.topicId;
    const subtopicId = subtopicEl?.dataset.subtopicId;

    if (action === "open-subject") {
      state.selectedSubjectId = subjectId;
      setView("subjectDetail");
      return;
    }

    if (action === "back-to-subjects") {
      setView("subjects");
      return;
    }

    if (action === "toggle-topic") {
      state.expandedTopics.has(topicId) ? state.expandedTopics.delete(topicId) : state.expandedTopics.add(topicId);
      renderSubjectDetail();
      return;
    }

    if (action === "add-topic") return createTopic(subjectId);
    if (action === "add-subtopic") return createSubtopic(subjectId, topicId);

    if (action === "edit-subject") {
      const subject = findSubject(subjectId);
      return openEntityModal({ mode: "edit", type: "subject", title: "Edit Subject", subjectId, name: subject.name, icon: subject.icon });
    }

    if (action === "edit-topic") {
      const topic = findTopic(subjectId, topicId);
      return openEntityModal({ mode: "edit", type: "topic", title: "Edit Topic", subjectId, topicId, name: topic.name, color: topic.color });
    }

    if (action === "edit-subtopic") {
      const subtopic = findSubtopic(subjectId, topicId, subtopicId);
      return openEntityModal({ mode: "edit", type: "subtopic", title: "Edit Subtopic", subjectId, topicId, subtopicId, name: subtopic.name });
    }

    if (action === "delete-subject") {
      const subject = findSubject(subjectId);
      if (!confirm(`Delete ${subject.name} and all of its topics?`)) return;
      return mutate("Subject deleted.", () => {
        state.data.subjects = state.data.subjects.filter(item => item.id !== subjectId);
        if (state.selectedSubjectId === subjectId) state.selectedSubjectId = null;
        addRecent("Subject deleted", subject.name);
      });
    }

    if (action === "delete-topic") {
      const subject = findSubject(subjectId);
      const topic = findTopic(subjectId, topicId);
      if (!confirm(`Delete ${topic.name}?`)) return;
      return mutate("Topic deleted.", () => {
        subject.topics = subject.topics.filter(item => item.id !== topicId);
        touchSubject(subject);
        addRecent("Topic deleted", `${subject.name} · ${topic.name}`);
      });
    }

    if (action === "delete-subtopic") {
      const subject = findSubject(subjectId);
      const topic = findTopic(subjectId, topicId);
      const subtopic = findSubtopic(subjectId, topicId, subtopicId);
      return mutate("Subtopic deleted.", () => {
        topic.subtopics = topic.subtopics.filter(item => item.id !== subtopicId);
        touchTopic(subject, topic);
        addRecent("Subtopic deleted", `${topic.name} · ${subtopic.name}`);
      });
    }

    if (action === "quick-complete-topic" || action === "mark-all") {
      const subject = findSubject(subjectId);
      const topic = findTopic(subjectId, topicId);
      return mutate("Topic completed.", () => {
        topic.subtopics.forEach(subtopic => {
          subtopic.completed = true;
          subtopic.updatedAt = Date.now();
        });
        updateStreak();
        touchTopic(subject, topic);
        addRecent("Topic completed", `${subject.name} · ${topic.name}`);
      });
    }

    if (action === "reset-topic") {
      const subject = findSubject(subjectId);
      const topic = findTopic(subjectId, topicId);
      return mutate("Topic progress reset.", () => {
        topic.subtopics.forEach(subtopic => {
          subtopic.completed = false;
          subtopic.updatedAt = Date.now();
        });
        touchTopic(subject, topic);
        addRecent("Topic reset", `${subject.name} · ${topic.name}`);
      });
    }

    if (action === "duplicate-topic") {
      const subject = findSubject(subjectId);
      const topic = findTopic(subjectId, topicId);
      return mutate("Topic duplicated.", () => {
        const copy = deepClone(topic);
        rekeyTopic(copy);
        copy.name = `${copy.name} Copy`;
        copy.updatedAt = Date.now();
        subject.topics.splice(subject.topics.findIndex(item => item.id === topicId) + 1, 0, copy);
        state.expandedTopics.add(copy.id);
        touchSubject(subject);
        addRecent("Topic duplicated", `${subject.name} · ${copy.name}`);
      });
    }

    if (action === "duplicate-subject") {
      const subject = findSubject(subjectId);
      return mutate("Subject duplicated.", () => {
        const copy = deepClone(subject);
        rekeySubject(copy);
        copy.name = `${copy.name} Copy`;
        copy.updatedAt = Date.now();
        state.data.subjects.splice(state.data.subjects.findIndex(item => item.id === subjectId) + 1, 0, copy);
        addRecent("Subject duplicated", copy.name);
      });
    }
  }

  function handleChange(event) {
    const input = event.target.closest('[data-action="toggle-subtopic"]');
    if (!input) return;

    const subtopicEl = input.closest("[data-subtopic-id]");
    const subjectId = subtopicEl?.dataset.subjectId;
    const topicId = subtopicEl?.dataset.topicId;
    const subtopicId = subtopicEl?.dataset.subtopicId;
    const subject = findSubject(subjectId);
    const topic = findTopic(subjectId, topicId);
    const subtopic = findSubtopic(subjectId, topicId, subtopicId);
    if (!subject || !topic || !subtopic) return;

    mutate(input.checked ? "Marked complete." : "Marked incomplete.", () => {
      subtopic.completed = input.checked;
      subtopic.updatedAt = Date.now();
      updateStreak();
      touchTopic(subject, topic);
      addRecent(subtopic.completed ? "Subtopic completed" : "Subtopic reopened", `${topic.name} · ${subtopic.name}`);
    });
  }

  function handleDragStart(event) {
    const topic = event.target.closest(".topic-card");
    const subtopic = event.target.closest(".subtopic-item");
    if (subtopic) {
      state.draggedSubtopic = {
        subjectId: subtopic.dataset.subjectId,
        topicId: subtopic.dataset.topicId,
        subtopicId: subtopic.dataset.subtopicId
      };
      subtopic.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
      return;
    }
    if (topic) {
      state.draggedTopic = {
        subjectId: topic.dataset.subjectId,
        topicId: topic.dataset.topicId
      };
      topic.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
    }
  }

  function handleDragOver(event) {
    const topic = event.target.closest(".topic-card");
    const subtopic = event.target.closest(".subtopic-item");
    if ((state.draggedTopic && topic) || (state.draggedSubtopic && subtopic)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    }
  }

  function handleDrop(event) {
    const targetSubtopic = event.target.closest(".subtopic-item");
    const targetTopic = event.target.closest(".topic-card");
    if (state.draggedSubtopic && targetSubtopic) {
      event.preventDefault();
      const from = state.draggedSubtopic;
      const to = {
        subjectId: targetSubtopic.dataset.subjectId,
        topicId: targetSubtopic.dataset.topicId,
        subtopicId: targetSubtopic.dataset.subtopicId
      };
      if (from.topicId !== to.topicId) return;
      return mutate("Subtopics reordered.", () => {
        const subject = findSubject(from.subjectId);
        const topic = findTopic(from.subjectId, from.topicId);
        moveItem(topic.subtopics, from.subtopicId, to.subtopicId);
        touchTopic(subject, topic);
      });
    }

    if (state.draggedTopic && targetTopic) {
      event.preventDefault();
      const from = state.draggedTopic;
      const to = {
        subjectId: targetTopic.dataset.subjectId,
        topicId: targetTopic.dataset.topicId
      };
      if (from.subjectId !== to.subjectId) return;
      return mutate("Topics reordered.", () => {
        const subject = findSubject(from.subjectId);
        moveItem(subject.topics, from.topicId, to.topicId);
        touchSubject(subject);
      });
    }
  }

  function handleDragEnd() {
    document.querySelectorAll(".dragging").forEach(el => el.classList.remove("dragging"));
    state.draggedTopic = null;
    state.draggedSubtopic = null;
  }

  function moveItem(collection, fromId, toId) {
    const fromIndex = collection.findIndex(item => item.id === fromId);
    const toIndex = collection.findIndex(item => item.id === toId);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
    const [item] = collection.splice(fromIndex, 1);
    collection.splice(toIndex, 0, item);
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function rekeySubject(subject) {
    subject.id = uid("subject");
    subject.createdAt = Date.now();
    subject.updatedAt = Date.now();
    subject.topics.forEach(rekeyTopic);
  }

  function rekeyTopic(topic) {
    topic.id = uid("topic");
    topic.createdAt = Date.now();
    topic.updatedAt = Date.now();
    topic.subtopics.forEach(subtopic => {
      subtopic.id = uid("subtopic");
      subtopic.updatedAt = Date.now();
    });
  }

  function mergeImportedSubjects(importedData) {
    const imported = normalizeData(importedData);
    const summary = { subjects: 0, topics: 0, subtopics: 0 };

    imported.subjects.forEach(importedSubject => {
      const existingSubject = findByName(state.data.subjects, importedSubject.name);
      if (!existingSubject) {
        const subjectCopy = deepClone(importedSubject);
        rekeySubject(subjectCopy);
        state.data.subjects.push(subjectCopy);
        summary.subjects += 1;
        summary.topics += subjectCopy.topics.length;
        summary.subtopics += subjectCopy.topics.reduce((total, topic) => total + topic.subtopics.length, 0);
        return;
      }

      importedSubject.topics.forEach(importedTopic => {
        const existingTopic = findByName(existingSubject.topics, importedTopic.name);
        if (!existingTopic) {
          const topicCopy = deepClone(importedTopic);
          rekeyTopic(topicCopy);
          existingSubject.topics.push(topicCopy);
          touchSubject(existingSubject);
          summary.topics += 1;
          summary.subtopics += topicCopy.subtopics.length;
          return;
        }

        importedTopic.subtopics.forEach(importedSubtopic => {
          const existingSubtopic = findByName(existingTopic.subtopics, importedSubtopic.name);
          if (existingSubtopic) return;
          existingTopic.subtopics.push({
            id: uid("subtopic"),
            name: importedSubtopic.name,
            completed: Boolean(importedSubtopic.completed),
            updatedAt: Date.now()
          });
          touchTopic(existingSubject, existingTopic);
          summary.subtopics += 1;
        });
      });
    });

    return summary;
  }

  function findByName(collection, name) {
    const key = nameKey(name);
    return collection.find(item => nameKey(item.name) === key);
  }

  function nameKey(name) {
    return String(name || "").trim().toLowerCase();
  }

  function exportProgress() {
    const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `study-progress-${todayKey()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast("Progress exported.");
  }

  function importProgress(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed || !Array.isArray(parsed.subjects)) throw new Error("Invalid file");
        let summary = null;
        mutate("Progress imported and merged.", () => {
          summary = mergeImportedSubjects(parsed);
          addRecent(
            "Progress imported",
            `${file.name} · ${summary.subjects} subjects, ${summary.topics} topics, ${summary.subtopics} subtopics added`
          );
        });
        if (summary && !summary.subjects && !summary.topics && !summary.subtopics) toast("Import contained no new items.");
      } catch {
        toast("That JSON file could not be imported.");
      } finally {
        els.importInput.value = "";
      }
    };
    reader.readAsText(file);
  }

  function focusData() {
    state.data.focus = normalizeFocus(state.data.focus);
    return state.data.focus;
  }

  function renderFocus() {
    const focus = focusData();
    const settings = focus.pomodoro.settings;
    const duration = timerDurationSeconds(state.timer.mode);
    if (!state.timer.remaining) state.timer.remaining = duration;

    els.timerModeLabel.textContent = state.timer.mode === "work"
      ? "Work Session"
      : state.timer.mode === "longBreak"
        ? "Long Break"
        : "Short Break";
    els.pomodoroSessions.textContent = focus.pomodoro.stats.completedSessions;
    els.timerDisplay.textContent = formatSeconds(state.timer.remaining);
    els.workDurationInput.value = settings.workMinutes;
    els.shortBreakInput.value = settings.shortBreakMinutes;
    els.longBreakInput.value = settings.longBreakMinutes;
    els.sessionsBeforeLongInput.value = settings.sessionsBeforeLongBreak;
    els.soundToggle.checked = settings.sound;
    els.notificationToggle.checked = settings.notifications;
    els.autoStartToggle.checked = settings.autoStart;
    els.timerStartBtn.disabled = state.timer.running;
    els.timerPauseBtn.disabled = !state.timer.running;
    els.timerResumeBtn.disabled = state.timer.running || state.timer.remaining === duration;

    const tasks = focus.planner.tasks;
    const completed = tasks.filter(task => task.completed).length;
    const percent = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
    els.taskCountText.textContent = `${completed} / ${tasks.length}`;
    els.taskPercentText.textContent = `${percent}%`;
    els.taskProgressBar.style.width = `${percent}%`;
    els.taskList.innerHTML = tasks.length
      ? tasks.map(renderTask).join("")
      : `<div class="empty-state">No tasks for today yet.</div>`;
  }

  function renderTask(task) {
    return `
      <div class="task-item ${task.completed ? "completed" : ""}" data-task-id="${task.id}" draggable="true">
        <label class="check-wrap">
          <input type="checkbox" data-action="toggle-task" ${task.completed ? "checked" : ""}>
          <span class="fake-check">✓</span>
        </label>
        <div class="task-text">${escapeHtml(task.text)}</div>
        <div class="task-actions">
          <button class="mini-btn" data-action="edit-task" type="button">Edit</button>
          <button class="mini-btn" data-action="delete-task" type="button">Delete</button>
        </div>
      </div>
    `;
  }

  function timerDurationSeconds(mode = state.timer.mode) {
    const settings = focusData().pomodoro.settings;
    if (mode === "shortBreak") return settings.shortBreakMinutes * 60;
    if (mode === "longBreak") return settings.longBreakMinutes * 60;
    return settings.workMinutes * 60;
  }

  function formatSeconds(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function startTimer() {
    if (state.timer.running) return;
    if (!state.timer.remaining) state.timer.remaining = timerDurationSeconds();
    state.timer.running = true;
    state.timer.intervalId = setInterval(tickTimer, 1000);
    renderFocus();
  }

  function pauseTimer() {
    clearInterval(state.timer.intervalId);
    state.timer.intervalId = null;
    state.timer.running = false;
    renderFocus();
  }

  function resetTimer() {
    pauseTimer();
    state.timer.mode = "work";
    state.timer.remaining = timerDurationSeconds("work");
    renderFocus();
  }

  function tickTimer() {
    state.timer.remaining = Math.max(0, state.timer.remaining - 1);
    els.timerDisplay.textContent = formatSeconds(state.timer.remaining);
    if (state.timer.remaining > 0) return;
    completeTimerSession();
  }

  function completeTimerSession() {
    pauseTimer();
    const previousMode = state.timer.mode;
    mutate(previousMode === "work" ? "Work session complete." : "Break complete.", () => {
      const focus = focusData();
      if (previousMode === "work") {
        focus.pomodoro.stats.completedSessions += 1;
        const beforeLong = focus.pomodoro.settings.sessionsBeforeLongBreak;
        state.timer.mode = focus.pomodoro.stats.completedSessions % beforeLong === 0 ? "longBreak" : "shortBreak";
      } else {
        state.timer.mode = "work";
      }
      state.timer.remaining = timerDurationSeconds(state.timer.mode);
    });
    notifyTimer(previousMode);
    if (focusData().pomodoro.settings.autoStart) startTimer();
  }

  function notifyTimer(mode) {
    const settings = focusData().pomodoro.settings;
    const message = mode === "work" ? "Work session complete." : "Break complete.";
    if (settings.sound) {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const audio = new AudioContextClass();
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.connect(gain);
        gain.connect(audio.destination);
        gain.gain.value = 0.08;
        oscillator.frequency.value = 740;
        oscillator.start();
        oscillator.stop(audio.currentTime + 0.18);
      } catch {}
    }
    if (settings.notifications && "Notification" in window) {
      if (Notification.permission === "granted") new Notification("Study Progress Tracker", { body: message });
      if (Notification.permission === "default") Notification.requestPermission();
    }
  }

  function updateTimerSettings() {
    mutate(null, () => {
      const settings = focusData().pomodoro.settings;
      settings.workMinutes = clampNumber(els.workDurationInput.value, settings.workMinutes, 1, 180);
      settings.shortBreakMinutes = clampNumber(els.shortBreakInput.value, settings.shortBreakMinutes, 1, 90);
      settings.longBreakMinutes = clampNumber(els.longBreakInput.value, settings.longBreakMinutes, 1, 180);
      settings.sessionsBeforeLongBreak = clampNumber(els.sessionsBeforeLongInput.value, settings.sessionsBeforeLongBreak, 1, 12);
      settings.sound = els.soundToggle.checked;
      settings.notifications = els.notificationToggle.checked;
      settings.autoStart = els.autoStartToggle.checked;
      if (!state.timer.running) state.timer.remaining = timerDurationSeconds(state.timer.mode);
    });
  }

  function addTask(text) {
    mutate("Task added.", () => {
      focusData().planner.tasks.push({
        id: uid("task"),
        text,
        completed: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    });
  }

  function handleTaskAction(event) {
    const input = event.target.closest('[data-action="toggle-task"]');
    if (!input) return;
    const taskId = input.closest("[data-task-id]")?.dataset.taskId;
    mutate(input.checked ? "Task complete." : "Task reopened.", () => {
      const task = focusData().planner.tasks.find(item => item.id === taskId);
      if (!task) return;
      task.completed = input.checked;
      task.updatedAt = Date.now();
    });
  }

  function handleTaskClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    const taskId = button.closest("[data-task-id]")?.dataset.taskId;
    if (action === "edit-task") {
      const task = focusData().planner.tasks.find(item => item.id === taskId);
      if (!task) return;
      const next = prompt("Edit task", task.text);
      if (next === null || !next.trim()) return;
      mutate("Task updated.", () => {
        task.text = next.trim();
        task.updatedAt = Date.now();
      });
    }
    if (action === "delete-task") {
      mutate("Task deleted.", () => {
        focusData().planner.tasks = focusData().planner.tasks.filter(item => item.id !== taskId);
      });
    }
  }

  function handleTaskDragStart(event) {
    const task = event.target.closest(".task-item");
    if (!task) return;
    state.draggedTaskId = task.dataset.taskId;
    task.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
  }

  function handleTaskDragOver(event) {
    if (state.draggedTaskId && event.target.closest(".task-item")) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    }
  }

  function handleTaskDrop(event) {
    const target = event.target.closest(".task-item");
    if (!state.draggedTaskId || !target) return;
    event.preventDefault();
    mutate("Tasks reordered.", () => moveItem(focusData().planner.tasks, state.draggedTaskId, target.dataset.taskId));
  }

  function handleTaskDragEnd() {
    document.querySelectorAll(".task-item.dragging").forEach(el => el.classList.remove("dragging"));
    state.draggedTaskId = null;
  }

  function setView(view) {
    state.view = view;
    els.sidebar.classList.remove("open");
    if (view === "subjectDetail") renderSubjectDetail();
    renderNavigation();
    if (view === "subjects") setTimeout(() => els.globalSearch.focus(), 80);
  }

  function toast(message) {
    const node = document.createElement("div");
    node.className = "toast";
    node.textContent = message;
    els.toastRegion.appendChild(node);
    setTimeout(() => node.remove(), 2600);
  }

  function showConfetti() {
    const colors = ["#22C55E", "#3B82F6", "#14B8A6", "#F59E0B", "#F8FAFC"];
    for (let i = 0; i < 46; i += 1) {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = colors[i % colors.length];
      piece.style.animationDelay = `${Math.random() * 220}ms`;
      piece.style.transform = `rotate(${Math.random() * 180}deg)`;
      els.confettiLayer.appendChild(piece);
      setTimeout(() => piece.remove(), 1500);
    }
  }

  function timeAgo(timestamp) {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.round(diff / 60000)} min ago`;
    if (diff < DAY) return `${Math.round(diff / 3600000)} hr ago`;
    return new Date(timestamp).toLocaleDateString([], { month: "short", day: "numeric" });
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function bindEvents() {
    els.navItems.forEach(item => item.addEventListener("click", () => setView(item.dataset.view)));
    els.menuToggle.addEventListener("click", () => els.sidebar.classList.toggle("open"));
    els.newSubjectBtn.addEventListener("click", createSubject);
    els.quickTopicBtn.addEventListener("click", () => createTopic());
    els.quickSubtopicBtn.addEventListener("click", () => createSubtopic());
    els.signInBtn.addEventListener("click", signInWithGoogle);
    els.settingsSignInBtn.addEventListener("click", signInWithGoogle);
    els.signOutBtn.addEventListener("click", signOut);
    els.settingsSignOutBtn.addEventListener("click", signOut);
    els.subjectGrid.addEventListener("click", handleClick);
    els.subjectGrid.addEventListener("keydown", event => {
      if ((event.key === "Enter" || event.key === " ") && event.target.closest('[data-action="open-subject"]')) {
        event.preventDefault();
        handleClick(event);
      }
    });
    els.subjectDetailShell.addEventListener("click", handleClick);
    els.subjectDetailShell.addEventListener("change", handleChange);
    els.subjectDetailShell.addEventListener("dragstart", handleDragStart);
    els.subjectDetailShell.addEventListener("dragover", handleDragOver);
    els.subjectDetailShell.addEventListener("drop", handleDrop);
    els.subjectDetailShell.addEventListener("dragend", handleDragEnd);
    els.subjectGrid.addEventListener("change", handleChange);
    els.subjectGrid.addEventListener("dragstart", handleDragStart);
    els.subjectGrid.addEventListener("dragover", handleDragOver);
    els.subjectGrid.addEventListener("drop", handleDrop);
    els.subjectGrid.addEventListener("dragend", handleDragEnd);
    els.globalSearch.addEventListener("input", event => {
      state.search = event.target.value;
      renderSubjects();
    });
    els.filterBtns.forEach(button => {
      button.addEventListener("click", () => {
        state.filter = button.dataset.filter;
        els.filterBtns.forEach(item => item.classList.toggle("active", item === button));
        renderSubjects();
      });
    });
    els.form.addEventListener("submit", handleModalSubmit);
    els.closeModal.addEventListener("click", closeModal);
    els.cancelModal.addEventListener("click", closeModal);
    els.exportBtn.addEventListener("click", exportProgress);
    els.importInput.addEventListener("change", event => importProgress(event.target.files[0]));
    els.timerStartBtn.addEventListener("click", startTimer);
    els.timerPauseBtn.addEventListener("click", pauseTimer);
    els.timerResumeBtn.addEventListener("click", startTimer);
    els.timerResetBtn.addEventListener("click", resetTimer);
    [
      els.workDurationInput,
      els.shortBreakInput,
      els.longBreakInput,
      els.sessionsBeforeLongInput,
      els.soundToggle,
      els.notificationToggle,
      els.autoStartToggle
    ].forEach(input => input.addEventListener("change", updateTimerSettings));
    els.taskForm.addEventListener("submit", event => {
      event.preventDefault();
      const text = els.taskInput.value.trim();
      if (!text) return;
      addTask(text);
      els.taskInput.value = "";
    });
    els.taskList.addEventListener("click", handleTaskClick);
    els.taskList.addEventListener("change", handleTaskAction);
    els.taskList.addEventListener("dragstart", handleTaskDragStart);
    els.taskList.addEventListener("dragover", handleTaskDragOver);
    els.taskList.addEventListener("drop", handleTaskDrop);
    els.taskList.addEventListener("dragend", handleTaskDragEnd);
    els.loadSampleBtn.addEventListener("click", () => {
      if (!confirm("Replace current tracker with the sample syllabus?")) return;
      mutate("Sample syllabus loaded.", () => {
        state.data = sampleData();
        state.expandedTopics.clear();
        state.selectedSubjectId = null;
      });
    });
    els.resetAllBtn.addEventListener("click", () => {
      if (!confirm("Reset all tracker data? This also syncs the reset if you are signed in.")) return;
      mutate("All data reset.", () => {
        state.data = normalizeData({ version: 1, streak: { count: 0, lastStudyDate: null }, recent: [], subjects: [] });
        state.expandedTopics.clear();
        state.selectedSubjectId = null;
      });
    });
    window.addEventListener("online", () => {
      if (cloud.user && cloud.ready) scheduleCloudSync();
      else setSyncStatus("offline", "Offline");
    });
    window.addEventListener("offline", () => setSyncStatus("offline", "Offline"));
    document.addEventListener("keydown", event => {
      const typing = ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName);
      if (event.key === "/" && !typing) {
        event.preventDefault();
        setView("subjects");
        els.globalSearch.focus();
      }
      if (typing) return;
      if (event.key.toLowerCase() === "n") createSubject();
      if (event.key === "1") setView("dashboard");
      if (event.key === "2") setView("subjects");
      if (event.key === "3") setView("focus");
      if (event.key === "4") setView("settings");
    });
  }

  bindEvents();
  initFirebase();
  render();
})();
