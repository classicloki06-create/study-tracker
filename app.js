(() => {
  const STORAGE_KEY = "study-progress-tracker:v1";
  const DAY = 24 * 60 * 60 * 1000;
  const EMPTY_DATA = {
    version: 1,
    streak: { count: 0, lastStudyDate: null },
    recent: [],
    subjects: []
  };

  const els = {
    sidebar: document.getElementById("sidebar"),
    menuToggle: document.getElementById("menuToggle"),
    navItems: [...document.querySelectorAll(".nav-item")],
    views: {
      dashboard: document.getElementById("dashboardView"),
      subjects: document.getElementById("subjectsView"),
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
    expandedTopics: new Set(),
    modal: null,
    draggedTopic: null,
    draggedSubtopic: null
  };

  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function nowText() {
    return new Date().toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
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
