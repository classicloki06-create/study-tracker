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
    return {
      version: 1,
      streak: data.streak || { count: 0, lastStudyDate: null },
      recent: Array.isArray(data.recent) ? data.recent.slice(0, 12) : [],
      subjects: (data.subjects || []).map(subject => ({
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
      }))
    };
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
    saveData();
    render();
    if (message) toast(message);
    for (const subject of state.data.subjects) {
      const previous = beforeComplete.get(subject.id) || 0;
      const current = subjectStats(subject).percent;
      if (previous < 100 && current === 100) showConfetti();
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
    els.streakCount.textContent = state.data.streak?.count || 0;
  }

  function renderNavigation() {
    const titles = {
      dashboard: ["Dashboard", "Exam Preparation Overview"],
      subjects: ["Subjects", "Syllabus Workspace"],
      settings: ["Settings", "Backup and Preferences"]
    };
    els.navItems.forEach(item => item.classList.toggle("active", item.dataset.view === state.view));
    Object.entries(els.views).forEach(([view, element]) => element.classList.toggle("active", view === state.view));
    els.viewEyebrow.textContent = titles[state.view][0];
    els.viewTitle.textContent = titles[state.view][1];
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
        <div class="topic-head">
          <div class="topic-title" data-action="toggle-topic">
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
    const subject = subjectId ? findSubject(subjectId) : state.data.subjects[0];
    if (!subject) return toast("Create a subject first.");
    openEntityModal({ mode: "create", type: "topic", title: `New Topic in ${subject.name}`, subjectId: subject.id });
  }

  function createSubtopic(subjectId, topicId) {
    const subject = subjectId ? findSubject(subjectId) : state.data.subjects[0];
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

    if (action === "toggle-topic") {
      state.expandedTopics.has(topicId) ? state.expandedTopics.delete(topicId) : state.expandedTopics.add(topicId);
      renderSubjects();
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
    subject.topics.forEach(rekeyTopic);
  }

  function rekeyTopic(topic) {
    topic.id = uid("topic");
    topic.createdAt = Date.now();
    topic.subtopics.forEach(subtopic => {
      subtopic.id = uid("subtopic");
      subtopic.updatedAt = Date.now();
    });
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
        mutate("Progress imported.", () => {
          state.data = normalizeData(parsed);
          state.expandedTopics.clear();
          addRecent("Progress imported", file.name);
        });
      } catch {
        toast("That JSON file could not be imported.");
      } finally {
        els.importInput.value = "";
      }
    };
    reader.readAsText(file);
  }

  function setView(view) {
    state.view = view;
    els.sidebar.classList.remove("open");
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
    els.subjectGrid.addEventListener("click", handleClick);
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
    els.loadSampleBtn.addEventListener("click", () => {
      if (!confirm("Replace current tracker with the sample syllabus?")) return;
      mutate("Sample syllabus loaded.", () => {
        state.data = sampleData();
        state.expandedTopics.clear();
      });
    });
    els.resetAllBtn.addEventListener("click", () => {
      if (!confirm("Reset all local study progress?")) return;
      mutate("All data reset.", () => {
        state.data = { version: 1, streak: { count: 0, lastStudyDate: null }, recent: [], subjects: [] };
        state.expandedTopics.clear();
      });
    });
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
      if (event.key === "3") setView("settings");
    });
  }

  bindEvents();
  render();
})();
