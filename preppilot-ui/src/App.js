import { useCallback, useEffect, useMemo, useState } from "react";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://127.0.0.1:8000";

const EMPTY_FORM = {
  title: "",
  topic: "",
  difficulty: "Easy",
  solved: false,
  time_taken: "",
};

const parseApiResponse = async (response, fallbackMessage) => {
  let payload = null;

  try {
    payload = await response.json();
  } catch (error) {
    throw new Error(fallbackMessage);
  }

  if (!response.ok || payload?.status !== "success") {
    throw new Error(
      payload?.detail?.message || payload?.message || fallbackMessage
    );
  }

  return payload?.data;
};

const requestData = async (endpoint, options, fallbackMessage) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  return parseApiResponse(response, fallbackMessage);
};

export default function App() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [formMode, setFormMode] = useState("add");
  const [editingProblemId, setEditingProblemId] = useState(null);

  const [problems, setProblems] = useState([]);
  const [totalProblems, setTotalProblems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [problemsError, setProblemsError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [listStatus, setListStatus] = useState("Showing all problems");
  const [topicToDelete, setTopicToDelete] = useState("");

  const [topicCount, setTopicCount] = useState({});
  const [weakTopics, setWeakTopics] = useState([]);
  const [minimumCount, setMinimumCount] = useState(0);
  const [prioritizedTopic, setPrioritizedTopic] = useState("");
  const [ruleSuggestion, setRuleSuggestion] = useState("No data available.");
  const [aiSuggestion, setAiSuggestion] = useState("No data available.");
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [insightsError, setInsightsError] = useState("");

  const weakTopicsLabel = weakTopics.length > 0 ? weakTopics.join(", ") : "None";

  const topicEntries = useMemo(
    () =>
      Object.entries(topicCount).sort((firstTopic, secondTopic) =>
        firstTopic[0].localeCompare(secondTopic[0])
      ),
    [topicCount]
  );

  const clearTransientMessages = () => {
    setSubmitError("");
    setSubmitSuccess("");
    setActionError("");
    setActionSuccess("");
  };

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setFormMode("add");
    setEditingProblemId(null);
  };

  const fetchProblems = useCallback(async () => {
    setIsLoading(true);
    setProblemsError("");

    try {
      const data = await requestData(
        "/problems?page=1&limit=100",
        { method: "GET" },
        "Unable to fetch problems"
      );

      const fetchedProblems = data?.problems || [];
      setProblems(fetchedProblems);
      setTotalProblems(data?.total ?? fetchedProblems.length);
      setListStatus("Showing all problems");
    } catch (error) {
      setProblemsError(error.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchInsights = useCallback(async () => {
    setInsightsLoading(true);
    setInsightsError("");

    try {
      const [analyzeData, suggestData, aiSuggestData] = await Promise.all([
        requestData("/analyze", { method: "GET" }, "Analysis failed"),
        requestData("/suggest", { method: "GET" }, "Suggestion failed"),
        requestData("/ai-suggest", { method: "GET" }, "AI suggestion failed"),
      ]);

      setTopicCount(analyzeData?.topic_count || {});
      setWeakTopics(analyzeData?.weak_topics || []);
      setMinimumCount(analyzeData?.minimum_count || 0);
      setPrioritizedTopic(suggestData?.prioritized_topic || "");
      setRuleSuggestion(suggestData?.suggestion || "No data available.");
      setAiSuggestion(aiSuggestData?.ai_suggestion || "No data available.");
    } catch (error) {
      setInsightsError(error.message || "Unable to fetch insights");
    } finally {
      setInsightsLoading(false);
    }
  }, []);

  const refreshAllData = useCallback(async () => {
    await Promise.all([fetchProblems(), fetchInsights()]);
  }, [fetchProblems, fetchInsights]);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((previousForm) => ({
      ...previousForm,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSearch = async (event) => {
    event.preventDefault();

    const trimmedKeyword = searchKeyword.trim();

    if (!trimmedKeyword) {
      setSortBy("default");
      fetchProblems();
      return;
    }

    setIsLoading(true);
    setProblemsError("");

    try {
      const data = await requestData(
        `/search?keyword=${encodeURIComponent(trimmedKeyword)}`,
        { method: "GET" },
        "Search failed"
      );

      const results = data?.results || [];
      setProblems(results);
      setSortBy("default");
      setListStatus(`Search results for "${trimmedKeyword}"`);
    } catch (error) {
      setProblemsError(error.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSortChange = async (event) => {
    const selectedSort = event.target.value;
    setSortBy(selectedSort);

    if (selectedSort === "default") {
      fetchProblems();
      return;
    }

    setIsLoading(true);
    setProblemsError("");

    try {
      const data = await requestData(
        `/sort?by=${selectedSort}`,
        { method: "GET" },
        "Sort failed"
      );

      setProblems(data?.problems || []);
      setListStatus(
        selectedSort === "time"
          ? "Sorted by time taken"
          : "Sorted by difficulty"
      );
    } catch (error) {
      setProblemsError(error.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDefaultView = () => {
    setSearchKeyword("");
    setSortBy("default");
    fetchProblems();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    clearTransientMessages();

    const cleanTitle = form.title.trim();
    const cleanTopic = form.topic.trim();
    const parsedTimeTaken = Number(form.time_taken);

    if (!cleanTitle) {
      setSubmitError("Title cannot be empty");
      return;
    }

    if (!cleanTopic) {
      setSubmitError("Topic cannot be empty");
      return;
    }

    if (!Number.isFinite(parsedTimeTaken) || parsedTimeTaken < 0) {
      setSubmitError("Time taken must be 0 or more");
      return;
    }

    const payload = {
      ...form,
      title: cleanTitle,
      topic: cleanTopic,
      time_taken: parsedTimeTaken,
    };

    const isEditMode = formMode === "edit" && editingProblemId !== null;
    const endpoint = isEditMode
      ? `/update-problem/${editingProblemId}`
      : "/add-problem";

    try {
      await requestData(
        endpoint,
        {
          method: isEditMode ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
        isEditMode ? "Unable to update problem" : "Unable to add problem"
      );

      setSubmitSuccess(
        isEditMode ? "Problem updated successfully." : "Problem added successfully."
      );
      resetForm();
      setSearchKeyword("");
      setSortBy("default");
      await refreshAllData();
    } catch (error) {
      setSubmitError(error.message || "Something went wrong");
    }
  };

  const handleEditClick = (problem) => {
    clearTransientMessages();
    setForm({
      title: problem.title,
      topic: problem.topic,
      difficulty: problem.difficulty,
      solved: problem.solved,
      time_taken: String(problem.time_taken),
    });
    setFormMode("edit");
    setEditingProblemId(problem.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    clearTransientMessages();
    resetForm();
  };

  const handleDeleteProblem = async (problem) => {
    clearTransientMessages();

    const isConfirmed = window.confirm(
      `Delete problem "${problem.title}" permanently?`
    );

    if (!isConfirmed) {
      return;
    }

    try {
      await requestData(
        `/delete-problem/${problem.id}`,
        { method: "DELETE" },
        "Unable to delete problem"
      );

      if (editingProblemId === problem.id) {
        resetForm();
      }

      setActionSuccess("Problem deleted successfully.");
      await refreshAllData();
    } catch (error) {
      setActionError(error.message || "Something went wrong");
    }
  };

  const handleDeleteAll = async () => {
    clearTransientMessages();

    const isConfirmed = window.confirm(
      "Delete all problems permanently? This cannot be undone."
    );

    if (!isConfirmed) {
      return;
    }

    try {
      const data = await requestData(
        "/delete-all",
        { method: "DELETE" },
        "Unable to delete all problems"
      );

      resetForm();
      setSearchKeyword("");
      setSortBy("default");
      setActionSuccess(
        `${data?.deleted_count ?? 0} problems deleted successfully.`
      );
      await refreshAllData();
    } catch (error) {
      setActionError(error.message || "Something went wrong");
    }
  };

  const handleDeleteTopic = async () => {
    clearTransientMessages();

    const cleanTopic = topicToDelete.trim();
    if (!cleanTopic) {
      setActionError("Enter a topic name to delete");
      return;
    }

    const isConfirmed = window.confirm(
      `Delete all problems from topic "${cleanTopic}"?`
    );

    if (!isConfirmed) {
      return;
    }

    try {
      const data = await requestData(
        `/delete-topic/${encodeURIComponent(cleanTopic)}`,
        { method: "DELETE" },
        "Unable to delete topic"
      );

      resetForm();
      setTopicToDelete("");
      setActionSuccess(
        `${data?.deleted_count ?? 0} problems deleted for topic "${cleanTopic}".`
      );
      await refreshAllData();
    } catch (error) {
      setActionError(error.message || "Something went wrong");
    }
  };

  const getDifficultyBadgeStyle = (difficulty) => {
    if (difficulty === "Easy") {
      return { ...styles.badgeBase, ...styles.badgeEasy };
    }

    if (difficulty === "Medium") {
      return { ...styles.badgeBase, ...styles.badgeMedium };
    }

    return { ...styles.badgeBase, ...styles.badgeHard };
  };

  return (
    <div style={styles.page}>
      <div style={styles.glowOne} />
      <div style={styles.glowTwo} />

      <div style={styles.container}>
        <section style={styles.hero}>
          <div>
            <div style={styles.heroBadge}>FastAPI + SQLite + Gemini</div>
            <h1 style={styles.heroTitle}>PrepPilot</h1>
            <p style={styles.heroSubtitle}>
              Track every DSA problem, auto-detect weak topics, and get smart
              next-step suggestions from both rules and AI.
            </p>
          </div>

          <div style={styles.heroStats}>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Total Problems</div>
              <div style={styles.statValue}>{totalProblems}</div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statLabel}>Weak Topics</div>
              <div style={styles.statValueSmall}>{weakTopicsLabel}</div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statLabel}>Priority Topic</div>
              <div style={styles.statValueSmall}>{prioritizedTopic || "None"}</div>
            </div>
          </div>
        </section>

        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Analysis and Suggestions</h2>
            <button
              style={styles.secondaryButton}
              type="button"
              onClick={fetchInsights}
            >
              Refresh Insights
            </button>
          </div>

          {insightsLoading ? (
            <p style={styles.mutedText}>Loading analysis...</p>
          ) : null}

          {insightsError ? <p style={styles.errorText}>{insightsError}</p> : null}

          {!insightsLoading && !insightsError ? (
            <div style={styles.insightGrid}>
              <div style={styles.insightBox}>
                <h3 style={styles.insightTitle}>Topic Coverage</h3>

                {topicEntries.length === 0 ? (
                  <p style={styles.mutedText}>No data available.</p>
                ) : (
                  <div style={styles.topicChipWrap}>
                    {topicEntries.map(([topic, count]) => (
                      <div key={topic} style={styles.topicChip}>
                        <span style={styles.topicChipTopic}>{topic}</span>
                        <span style={styles.topicChipCount}>{count}</span>
                      </div>
                    ))}
                  </div>
                )}

                <p style={styles.metaText}>Minimum topic count: {minimumCount}</p>
              </div>

              <div style={styles.insightBox}>
                <h3 style={styles.insightTitle}>Rule-Based Suggestion</h3>
                <p style={styles.suggestionText}>{ruleSuggestion}</p>
              </div>

              <div style={styles.insightBox}>
                <h3 style={styles.insightTitle}>AI Coach Suggestion</h3>
                <p style={styles.suggestionText}>{aiSuggestion}</p>
              </div>
            </div>
          ) : null}
        </section>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>
            {formMode === "edit" ? "Update Problem" : "Add Problem"}
          </h2>

          <form onSubmit={handleSubmit}>
            <input
              style={styles.input}
              type="text"
              name="title"
              placeholder="Problem Title"
              value={form.title}
              onChange={handleChange}
            />

            <input
              style={styles.input}
              type="text"
              name="topic"
              placeholder="Topic"
              value={form.topic}
              onChange={handleChange}
            />

            <select
              style={styles.input}
              name="difficulty"
              value={form.difficulty}
              onChange={handleChange}
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>

            <input
              style={styles.input}
              type="number"
              name="time_taken"
              placeholder="Time Taken (minutes)"
              value={form.time_taken}
              onChange={handleChange}
            />

            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="solved"
                checked={form.solved}
                onChange={handleChange}
              />
              Solved
            </label>

            <div style={styles.formButtons}>
              <button style={styles.primaryButton} type="submit">
                {formMode === "edit" ? "Update Problem" : "Add Problem"}
              </button>

              {formMode === "edit" ? (
                <button
                  style={styles.secondaryButton}
                  type="button"
                  onClick={handleCancelEdit}
                >
                  Cancel Edit
                </button>
              ) : null}
            </div>

            {submitSuccess ? <p style={styles.successText}>{submitSuccess}</p> : null}
            {submitError ? <p style={styles.errorText}>{submitError}</p> : null}
          </form>
        </section>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Problems List</h2>

          <div style={styles.controlsRow}>
            <form style={styles.searchForm} onSubmit={handleSearch}>
              <input
                style={styles.inputNoMargin}
                type="text"
                placeholder="Search by title or topic"
                value={searchKeyword}
                onChange={(event) => setSearchKeyword(event.target.value)}
              />
              <button style={styles.secondaryButton} type="submit">
                Search
              </button>
            </form>

            <select
              style={styles.sortSelect}
              value={sortBy}
              onChange={handleSortChange}
            >
              <option value="default">Default (All)</option>
              <option value="time">Sort by Time</option>
              <option value="difficulty">Sort by Difficulty</option>
            </select>

            <button
              style={styles.secondaryButton}
              type="button"
              onClick={handleDefaultView}
            >
              Default View
            </button>
          </div>

          <div style={styles.controlsRow}>
            <div style={styles.searchForm}>
              <input
                style={styles.inputNoMargin}
                type="text"
                placeholder="Delete by exact topic name"
                value={topicToDelete}
                onChange={(event) => setTopicToDelete(event.target.value)}
              />
              <button
                style={styles.dangerOutlineButton}
                type="button"
                onClick={handleDeleteTopic}
              >
                Delete Topic
              </button>
            </div>

            <div />

            <button
              style={styles.dangerButton}
              type="button"
              onClick={handleDeleteAll}
            >
              Delete All Problems
            </button>
          </div>

          <p style={styles.listStatusText}>{listStatus}</p>

          {actionSuccess ? <p style={styles.successText}>{actionSuccess}</p> : null}
          {actionError ? <p style={styles.errorText}>{actionError}</p> : null}

          {isLoading ? <p style={styles.mutedText}>Loading problems...</p> : null}
          {problemsError ? <p style={styles.errorText}>{problemsError}</p> : null}

          {!isLoading && !problemsError && problems.length === 0 ? (
            <p style={styles.mutedText}>No problems found. Add your first one.</p>
          ) : null}

          {!isLoading && !problemsError && problems.length > 0 ? (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Title</th>
                    <th style={styles.th}>Topic</th>
                    <th style={styles.th}>Difficulty</th>
                    <th style={styles.th}>Solved</th>
                    <th style={styles.th}>Time</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {problems.map((problem) => (
                    <tr key={problem.id}>
                      <td style={styles.td}>{problem.title}</td>
                      <td style={styles.td}>{problem.topic}</td>
                      <td style={styles.td}>
                        <span style={getDifficultyBadgeStyle(problem.difficulty)}>
                          {problem.difficulty}
                        </span>
                      </td>
                      <td style={styles.td}>{problem.solved ? "Yes" : "No"}</td>
                      <td style={styles.td}>{problem.time_taken} min</td>
                      <td style={styles.td}>
                        <div style={styles.rowButtons}>
                          <button
                            style={styles.secondaryButtonSmall}
                            type="button"
                            onClick={() => handleEditClick(problem)}
                          >
                            Edit
                          </button>
                          <button
                            style={styles.dangerOutlineButtonSmall}
                            type="button"
                            onClick={() => handleDeleteProblem(problem)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 15% 20%, #123c7a 0%, rgba(18, 60, 122, 0) 35%), radial-gradient(circle at 85% 15%, #6a3f14 0%, rgba(106, 63, 20, 0) 32%), linear-gradient(155deg, #0a1424 0%, #0f2035 45%, #1b2634 100%)",
    color: "#f8fafc",
    fontFamily: "'Sora', 'Space Grotesk', sans-serif",
    padding: "24px 16px 40px",
    position: "relative",
    overflow: "hidden",
  },
  glowOne: {
    position: "absolute",
    width: "280px",
    height: "280px",
    borderRadius: "50%",
    background: "rgba(56, 189, 248, 0.15)",
    filter: "blur(30px)",
    top: "-80px",
    left: "-70px",
    pointerEvents: "none",
  },
  glowTwo: {
    position: "absolute",
    width: "240px",
    height: "240px",
    borderRadius: "50%",
    background: "rgba(249, 115, 22, 0.14)",
    filter: "blur(28px)",
    bottom: "-70px",
    right: "-60px",
    pointerEvents: "none",
  },
  container: {
    maxWidth: "1240px",
    margin: "0 auto",
    position: "relative",
    zIndex: 1,
    display: "grid",
    gap: "20px",
  },
  hero: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "20px",
    background: "rgba(8, 21, 36, 0.78)",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    borderRadius: "22px",
    padding: "26px",
    boxShadow: "0 18px 42px rgba(3, 10, 20, 0.45)",
    backdropFilter: "blur(6px)",
  },
  heroBadge: {
    display: "inline-block",
    background: "rgba(14, 116, 144, 0.4)",
    color: "#bae6fd",
    padding: "7px 13px",
    borderRadius: "999px",
    fontSize: "12px",
    marginBottom: "14px",
    letterSpacing: "0.04em",
    fontWeight: 700,
  },
  heroTitle: {
    fontSize: "clamp(2.25rem, 5vw, 3.4rem)",
    margin: "0 0 10px 0",
    color: "#e2e8f0",
    lineHeight: 1.1,
  },
  heroSubtitle: {
    color: "#cbd5e1",
    fontSize: "16px",
    lineHeight: 1.7,
    margin: 0,
    maxWidth: "58ch",
  },
  heroStats: {
    display: "grid",
    gap: "12px",
    alignContent: "center",
  },
  statCard: {
    background: "rgba(8, 21, 36, 0.88)",
    borderRadius: "14px",
    padding: "15px 16px",
    border: "1px solid rgba(148, 163, 184, 0.14)",
  },
  statLabel: {
    color: "#93c5fd",
    fontSize: "12px",
    marginBottom: "7px",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    fontWeight: 700,
  },
  statValue: {
    fontSize: "28px",
    fontWeight: 800,
    color: "#f8fafc",
  },
  statValueSmall: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#f8fafc",
    lineHeight: 1.5,
  },
  card: {
    background: "rgba(8, 21, 36, 0.8)",
    borderRadius: "18px",
    padding: "22px",
    border: "1px solid rgba(148, 163, 184, 0.14)",
    boxShadow: "0 14px 36px rgba(3, 10, 20, 0.35)",
    backdropFilter: "blur(6px)",
  },
  cardHeader: {
    display: "flex",
    gap: "10px",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: "12px",
  },
  cardTitle: {
    marginTop: 0,
    marginBottom: "12px",
    color: "#bae6fd",
    fontSize: "22px",
  },
  insightGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "12px",
  },
  insightBox: {
    border: "1px solid rgba(148, 163, 184, 0.16)",
    borderRadius: "12px",
    padding: "14px",
    background: "rgba(15, 32, 53, 0.6)",
  },
  insightTitle: {
    margin: "0 0 10px 0",
    color: "#e2e8f0",
    fontSize: "16px",
  },
  topicChipWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  topicChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    border: "1px solid rgba(56, 189, 248, 0.4)",
    background: "rgba(14, 116, 144, 0.25)",
    borderRadius: "999px",
    padding: "6px 11px",
  },
  topicChipTopic: {
    color: "#e0f2fe",
    fontSize: "13px",
    fontWeight: 600,
  },
  topicChipCount: {
    color: "#7dd3fc",
    fontSize: "13px",
    fontWeight: 700,
  },
  suggestionText: {
    margin: 0,
    color: "#e2e8f0",
    lineHeight: 1.6,
    fontSize: "14px",
    whiteSpace: "pre-wrap",
  },
  metaText: {
    marginTop: "10px",
    marginBottom: 0,
    fontSize: "12px",
    color: "#93c5fd",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    marginBottom: "12px",
    borderRadius: "10px",
    border: "1px solid #334155",
    background: "rgba(15, 23, 42, 0.95)",
    color: "#f8fafc",
    boxSizing: "border-box",
    outline: "none",
  },
  inputNoMargin: {
    width: "100%",
    padding: "11px 12px",
    borderRadius: "10px",
    border: "1px solid #334155",
    background: "rgba(15, 23, 42, 0.95)",
    color: "#f8fafc",
    boxSizing: "border-box",
    outline: "none",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "16px",
    color: "#e2e8f0",
    fontSize: "14px",
  },
  formButtons: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  primaryButton: {
    background: "linear-gradient(135deg, #0284c7, #2563eb)",
    color: "#f8fafc",
    padding: "11px 14px",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 700,
    minWidth: "180px",
  },
  secondaryButton: {
    background: "rgba(15, 23, 42, 0.92)",
    color: "#cbd5e1",
    padding: "10px 14px",
    border: "1px solid #334155",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  secondaryButtonSmall: {
    background: "rgba(15, 23, 42, 0.92)",
    color: "#cbd5e1",
    padding: "7px 10px",
    border: "1px solid #334155",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "12px",
  },
  dangerButton: {
    background: "linear-gradient(135deg, #b91c1c, #dc2626)",
    color: "#fee2e2",
    padding: "10px 14px",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  dangerOutlineButton: {
    background: "rgba(127, 29, 29, 0.2)",
    color: "#fecaca",
    padding: "10px 14px",
    border: "1px solid rgba(248, 113, 113, 0.4)",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  dangerOutlineButtonSmall: {
    background: "rgba(127, 29, 29, 0.2)",
    color: "#fecaca",
    padding: "7px 10px",
    border: "1px solid rgba(248, 113, 113, 0.4)",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "12px",
  },
  successText: {
    marginTop: "12px",
    color: "#86efac",
    fontSize: "14px",
    marginBottom: 0,
  },
  errorText: {
    marginTop: "12px",
    color: "#fca5a5",
    fontSize: "14px",
    marginBottom: 0,
  },
  mutedText: {
    color: "#94a3b8",
    margin: 0,
  },
  controlsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "10px",
    marginBottom: "10px",
    alignItems: "center",
  },
  searchForm: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "10px",
  },
  sortSelect: {
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid #334155",
    background: "rgba(15, 23, 42, 0.95)",
    color: "#cbd5e1",
    outline: "none",
    minWidth: "160px",
  },
  listStatusText: {
    color: "#7dd3fc",
    marginTop: "4px",
    marginBottom: "10px",
    fontSize: "14px",
  },
  tableWrap: {
    overflowX: "auto",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    borderRadius: "12px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "850px",
  },
  th: {
    textAlign: "left",
    background: "rgba(15, 23, 42, 0.95)",
    color: "#93c5fd",
    padding: "12px",
    fontSize: "13px",
    borderBottom: "1px solid rgba(148, 163, 184, 0.2)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  td: {
    padding: "12px",
    borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
    color: "#e2e8f0",
    fontSize: "14px",
    verticalAlign: "middle",
  },
  rowButtons: {
    display: "flex",
    gap: "8px",
  },
  badgeBase: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
  },
  badgeEasy: {
    background: "rgba(34, 197, 94, 0.15)",
    color: "#86efac",
  },
  badgeMedium: {
    background: "rgba(251, 191, 36, 0.15)",
    color: "#fde68a",
  },
  badgeHard: {
    background: "rgba(248, 113, 113, 0.15)",
    color: "#fca5a5",
  },
};
