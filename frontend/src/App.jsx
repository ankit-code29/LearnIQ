import React, { useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { Sidebar } from './components/Sidebar'
import { ToastContainer } from './components/Toast'
import { Confetti } from './components/Confetti'
import { AuthView } from './pages/AuthView'
import { DashboardView } from './pages/DashboardView'
import { DocumentsView } from './pages/DocumentsView'
import { QuizView } from './pages/QuizView'
import { ProfileView } from './pages/ProfileView'
import {
  mockUser,
  mockDocuments,
  mockInsights,
  mockHistory,
  sampleQuizzesByTopic,
} from './utils/mockData'
import './App.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

const defaultAuthForm = { name: '', email: '', password: '' }

async function readError(response) {
  const text = await response.text()
  if (!text) {
    return response.statusText || 'Something went wrong.'
  }

  try {
    const payload = JSON.parse(text)
    if (Array.isArray(payload.detail)) {
      return payload.detail
        .map((item) => {
          const field = Array.isArray(item.loc) ? item.loc.filter((part) => part !== 'body').join('.') : ''
          return field ? `${field}: ${item.msg}` : item.msg
        })
        .join('; ')
    }
    if (typeof payload.detail === 'string') return payload.detail
    if (typeof payload.message === 'string') return payload.message
    return text
  } catch {
    return text
  }
}

async function fetchJson(url, options = {}) {
  const requestOptions = { ...options }

  if (!requestOptions.headers) {
    requestOptions.headers = {}
  }

  if (!(requestOptions.body instanceof FormData) && !requestOptions.headers['Content-Type']) {
    requestOptions.headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(url, requestOptions)

  if (!response.ok) {
    throw new Error(await readError(response))
  }

  if (response.status === 204) {
    return null
  }

  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    return response.json()
  }

  return null
}

function App() {
  const navigate = useNavigate()
  const location = useLocation()

  const [token, setToken] = useState(() => localStorage.getItem('learniq-token') || '')
  const [user, setUser] = useState(null)
  const [documents, setDocuments] = useState([])
  const [insights, setInsights] = useState(null)
  const [history, setHistory] = useState([])
  const [isDemoMode, setIsDemoMode] = useState(() => localStorage.getItem('learniq-demo') === 'true')

  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState(defaultAuthForm)
  const [quizForm, setQuizForm] = useState({
    topic: '',
    difficulty: 'medium',
    question_count: 3,
    document_id: null,
    document_name: '',
  })
  const [generatedQuiz, setGeneratedQuiz] = useState(null)
  const [quizAnswers, setQuizAnswers] = useState({})
  const [submitResult, setSubmitResult] = useState(null)
  const [showConfetti, setShowConfetti] = useState(false)

  const [loading, setLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [toasts, setToasts] = useState([])
  const [llmInfo, setLlmInfo] = useState(null)
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('learniq-theme')
    return saved ? saved === 'dark' : true
  })

  // Toast Notification helper
  const addToast = (message, type = 'info', title = '') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type, title, duration: 4500 }])
  }

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token],
  )

  const loadSession = async () => {
    if (!token) {
      if (isDemoMode) {
        setUser(mockUser)
        setDocuments(mockDocuments)
        setInsights(mockInsights)
        setHistory(mockHistory)
      } else {
        setUser(null)
        setDocuments([])
        setInsights(null)
        setHistory([])
      }
      return
    }

    if (isDemoMode) {
      setUser(mockUser)
      setDocuments(mockDocuments)
      setInsights(mockInsights)
      setHistory(mockHistory)
      return
    }

    setLoading(true)
    try {
      const [profile, docList, insightData, historyData] = await Promise.all([
        fetchJson(`${API_BASE}/auth/me`, { headers: authHeaders }),
        fetchJson(`${API_BASE}/documents`, { headers: authHeaders }),
        fetchJson(`${API_BASE}/quizzes/insights`, { headers: authHeaders }).catch(() => null),
        fetchJson(`${API_BASE}/quizzes/history`, { headers: authHeaders }).catch(() => []),
      ])

      setUser(profile)
      setDocuments(Array.isArray(docList) ? docList : [])
      setInsights(insightData)
      setHistory(Array.isArray(historyData) ? historyData : [])
    } catch (loadError) {
      console.warn('Backend session load error, falling back to interactive demo data:', loadError.message)
      // Seamlessly switch to demo mode if backend is not reachable
      setIsDemoMode(true)
      setUser(mockUser)
      setDocuments(mockDocuments)
      setInsights(mockInsights)
      setHistory(mockHistory)
      addToast('Connected in Live Demo Mode. You can explore all UI features!', 'info', 'Demo Mode Activated')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJson(`${API_BASE}/health`)
      .then((data) => setLlmInfo(data))
      .catch(() => setLlmInfo(null))
  }, [])

  useEffect(() => {
    if (token || isDemoMode) {
      loadSession()
    }
  }, [token, isDemoMode])

  useEffect(() => {
    localStorage.setItem('learniq-theme', darkMode ? 'dark' : 'light')
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  const handleAuthChange = (event) => {
    const { name, value } = event.target
    setAuthForm((current) => ({ ...current, [name]: value }))
  }

  const handleAuthSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)

    try {
      const endpoint = authMode === 'login' ? 'auth/login' : 'auth/register'
      const payload =
        authMode === 'login'
          ? { email: authForm.email, password: authForm.password }
          : {
              name: authForm.name.trim(),
              email: authForm.email.trim(),
              password: authForm.password,
            }

      const response = await fetchJson(`${API_BASE}/${endpoint}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      if (authMode === 'login') {
        setToken(response.access_token)
        localStorage.setItem('learniq-token', response.access_token)
        setIsDemoMode(false)
        localStorage.setItem('learniq-demo', 'false')
        addToast('Welcome back! Logged in successfully.', 'success', 'Sign In Successful')
        navigate('/dashboard')
      } else {
        addToast('Registration successful! Please sign in with your credentials.', 'success', 'Account Created')
        setAuthMode('login')
        setAuthForm({ ...defaultAuthForm, email: payload.email })
      }
    } catch (submitError) {
      addToast(submitError.message, 'error', 'Authentication Failed')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickDemoLogin = () => {
    setIsDemoMode(true)
    localStorage.setItem('learniq-demo', 'true')
    setToken('demo-jwt-token')
    localStorage.setItem('learniq-token', 'demo-jwt-token')
    setUser(mockUser)
    setDocuments(mockDocuments)
    setInsights(mockInsights)
    setHistory(mockHistory)
    addToast('Welcome Alex! Demo workspace loaded with sample data.', 'success', 'Demo Sign-In')
    navigate('/dashboard')
  }

  const handleLogout = () => {
    setToken('')
    localStorage.removeItem('learniq-token')
    setIsDemoMode(false)
    localStorage.removeItem('learniq-demo')
    setUser(null)
    setDocuments([])
    setInsights(null)
    setHistory([])
    setGeneratedQuiz(null)
    setQuizAnswers({})
    setSubmitResult(null)
    addToast('Signed out of LearnIQ.', 'info', 'Logged Out')
    navigate('/login')
  }

  const handleDocumentUpload = async (file) => {
    if (!file) return

    setIsUploading(true)
    try {
      if (isDemoMode) {
        throw new Error('Real PDF analysis is unavailable in Demo Mode. Sign in to a live account and upload again.')
      }

      const formData = new FormData()
      formData.append('file', file)
      const response = await fetchJson(`${API_BASE}/documents/upload`, {
        method: 'POST',
        body: formData,
        headers: { Authorization: `Bearer ${token}` },
      })

      addToast(`Uploaded ${response.file_name} successfully.`, 'success', 'Upload Complete')
      await loadSession()
    } catch (uploadErr) {
      addToast(uploadErr.message, 'error', 'Upload Error')
      throw uploadErr
    } finally {
      setIsUploading(false)
    }
  }

  const handleQuizGenerate = async (event) => {
    if (event) event.preventDefault()

    if (!quizForm.topic.trim()) {
      addToast('Please enter or select a topic for your quiz.', 'error', 'Missing Topic')
      return
    }

    setLoading(true)
    try {
      if (isDemoMode) {
        await new Promise((resolve) => setTimeout(resolve, 800))
        const existingSample = sampleQuizzesByTopic[quizForm.topic]
        let generated

        // Build a question pool of 10 templates, then slice to the requested count
        const _ts = Date.now()
        const t = quizForm.topic
        const allQuestionTemplates = [
          {
            question: `In the context of ${t}, what is considered the primary architectural principle?`,
            options: ['Decoupling components and isolating state transitions', 'Maximizing coupling between database layers and UI components', 'Executing all calculations synchronously in the main thread', 'Disabling validation schemas to increase raw throughput'],
            correct_answer: 'Decoupling components and isolating state transitions',
            explanation: 'Decoupling isolates failures and enables scalable independent deployments.',
          },
          {
            question: `Which trade-off is most commonly observed when optimizing for low latency in ${t}?`,
            options: ['Caching introduces potential cache invalidation and eventual consistency complexity', 'Memory consumption decreases linearly to zero', 'Network round-trips multiply exponentially', 'All asynchronous tasks become synchronous blocks'],
            correct_answer: 'Caching introduces potential cache invalidation and eventual consistency complexity',
            explanation: 'Caching dramatically improves read latency at the cost of consistency management.',
          },
          {
            question: `What is the recommended best practice for verifying correctness in ${t}?`,
            options: ['Automated integration testing and invariant assertion checks', 'Manual spot inspection of production log files', 'Relying solely on runtime exception handlers without testing', 'Deploying unvalidated code to production canary tiers directly'],
            correct_answer: 'Automated integration testing and invariant assertion checks',
            explanation: 'Automated testing and assertions ensure invariants hold under edge cases.',
          },
          {
            question: `Which design pattern is most applicable for managing shared state in a large-scale ${t} system?`,
            options: ['Observer / Event-driven publish-subscribe pattern', 'Direct mutable global variable shared across all modules', 'Synchronous polling loop checking for state changes', 'Hardcoded configuration values compiled at build time'],
            correct_answer: 'Observer / Event-driven publish-subscribe pattern',
            explanation: 'Publish-subscribe decouples producers from consumers, enabling scalable reactive state management.',
          },
          {
            question: `When scaling a ${t} system horizontally, what is the primary challenge to address?`,
            options: ['Maintaining data consistency across distributed nodes', 'Reducing the number of CPU cores per machine', 'Switching from TCP to UDP for all communication', 'Eliminating all caching layers to simplify deployment'],
            correct_answer: 'Maintaining data consistency across distributed nodes',
            explanation: 'Horizontal scaling introduces replication lag and partition challenges requiring consensus mechanisms.',
          },
          {
            question: `What is the role of idempotency in ${t} API design?`,
            options: ['Ensures repeated identical requests produce the same result without side effects', 'Guarantees every request is processed exactly once regardless of retries', 'Prevents duplicate users from registering in the system', 'Compresses HTTP payloads to reduce bandwidth usage'],
            correct_answer: 'Ensures repeated identical requests produce the same result without side effects',
            explanation: 'Idempotency is critical for safe retries in distributed systems where network failures are common.',
          },
          {
            question: `Which metric is most critical when evaluating performance bottlenecks in a ${t} pipeline?`,
            options: ['P99 latency (99th percentile response time)', 'Total number of lines of code in the codebase', 'The color scheme of the monitoring dashboard', 'Number of HTTP redirects per request'],
            correct_answer: 'P99 latency (99th percentile response time)',
            explanation: 'P99 latency reveals the worst-case experience for 1% of users, exposing hidden tail-latency issues.',
          },
          {
            question: `What does the Single Responsibility Principle (SRP) dictate in ${t}?`,
            options: ['A module should have only one reason to change', 'Every function must be written in a single line of code', 'All logic should be consolidated into one monolithic class', 'A service must handle exactly one HTTP request at a time'],
            correct_answer: 'A module should have only one reason to change',
            explanation: 'SRP keeps modules focused and reduces the blast radius of changes in a codebase.',
          },
          {
            question: `How does circuit breaking improve resilience in a ${t} microservices architecture?`,
            options: ['Stops routing traffic to a failing service to prevent cascade failures', 'Encrypts all inter-service communication with rotating TLS certificates', 'Duplicates every request to two services and uses the faster response', 'Resets all service instances every 24 hours to clear memory leaks'],
            correct_answer: 'Stops routing traffic to a failing service to prevent cascade failures',
            explanation: 'Circuit breakers detect failure thresholds and open the circuit, giving the downstream service time to recover.',
          },
          {
            question: `What is the primary advantage of using an event-driven architecture for ${t}?`,
            options: ['Loose coupling between services enabling independent scaling and deployment', 'Guarantees strict sequential processing of every business transaction', 'Removes the need for any form of data persistence or storage', 'Requires fewer developers because services self-document their own APIs'],
            correct_answer: 'Loose coupling between services enabling independent scaling and deployment',
            explanation: 'Event-driven systems decouple producers and consumers, enabling each to scale and evolve independently.',
          },
        ]

        // If the topic matches a sample, use those questions as the base pool (pad with templates if needed)
        const baseSample = existingSample ? existingSample.questions : []
        const templatePool = baseSample.length > 0
          ? [...baseSample, ...allQuestionTemplates]
          : allQuestionTemplates

        const count = Number(quizForm.question_count) || 3
        const selectedQuestions = templatePool.slice(0, count).map((q, i) => ({
          ...q,
          id: _ts + i + 1,
        }))

        generated = {
          id: _ts,
          topic: quizForm.topic,
          difficulty: quizForm.difficulty,
          questions: selectedQuestions,
        }

        setGeneratedQuiz(generated)
        setSubmitResult(null)
        setQuizAnswers({})
        addToast(`Quiz on "${quizForm.topic}" generated!`, 'success', 'Quiz Ready')
        navigate('/quiz')
        return
      }

      const response = await fetchJson(`${API_BASE}/quizzes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          topic: quizForm.topic,
          difficulty: quizForm.difficulty,
          question_count: Number(quizForm.question_count),
          document_id: quizForm.document_id,
        }),
      })

      setGeneratedQuiz(response)
      setSubmitResult(null)
      setQuizAnswers({})
      addToast(`Generated ${response.questions?.length || 3} questions for ${quizForm.topic}`, 'success', 'Quiz Ready')
      navigate('/quiz')
    } catch (submitError) {
      addToast(submitError.message, 'error', 'Quiz Generation Failed')
    } finally {
      setLoading(false)
    }
  }

  const handleAnswerChange = (questionId, option) => {
    setQuizAnswers((current) => ({ ...current, [questionId]: option }))
  }

  const handleSubmitQuiz = async () => {
    if (!generatedQuiz || !generatedQuiz.questions?.length) {
      addToast('No active quiz found to submit.', 'error')
      return
    }

    setLoading(true)

    try {
      if (isDemoMode) {
        await new Promise((resolve) => setTimeout(resolve, 600))
        let correctCount = 0
        const total = generatedQuiz.questions.length

        generatedQuiz.questions.forEach((q) => {
          if (quizAnswers[q.id] === q.correct_answer) {
            correctCount += 1
          }
        })

        const percentage = Math.round((correctCount / total) * 100)
        const mockRes = {
          quiz_id: generatedQuiz.id,
          score: correctCount,
          total_questions: total,
          correct_answers: correctCount,
          percentage,
          reviews: generatedQuiz.questions.map((question) => ({
            question_id: question.id,
            selected_answer: quizAnswers[question.id] || '',
            correct_answer: question.correct_answer,
            is_correct: quizAnswers[question.id] === question.correct_answer,
            explanation: question.explanation || null,
          })),
        }

        setSubmitResult(mockRes)

        // Add to history
        const newHistoryEntry = {
          attempt_id: Date.now(),
          quiz_id: generatedQuiz.id,
          topic: generatedQuiz.topic,
          score: correctCount,
          total_questions: total,
          correct_answers: correctCount,
          percentage,
          created_at: 'Just now',
        }
        setHistory((prev) => [newHistoryEntry, ...prev])

        // Trigger confetti for scores >= 70%
        if (percentage >= 70) {
          setShowConfetti(true)
          setTimeout(() => setShowConfetti(false), 3000)
        }

        addToast(`Scored ${percentage}% on ${generatedQuiz.topic}!`, 'success', 'Quiz Evaluated')
        return
      }

      const answers = generatedQuiz.questions.map((question) => ({
        question_id: question.id,
        selected_answer: quizAnswers[question.id] || '',
      }))

      const result = await fetchJson(`${API_BASE}/quizzes/${generatedQuiz.id}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ answers }),
      })

      setSubmitResult(result)

      if (result.percentage >= 70) {
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 3000)
      }

      addToast(`Submitted successfully! Score: ${result.percentage}%`, 'success', 'Results Ready')
      await loadSession()
    } catch (submitError) {
      addToast(submitError.message, 'error', 'Submission Failed')
    } finally {
      setLoading(false)
    }
  }

  const handleLaunchPractice = (topicName, document = null) => {
    setQuizForm((prev) => ({
      ...prev,
      topic: topicName,
      document_id: document?.id ?? null,
      document_name: document?.file_name ?? '',
    }))
    setGeneratedQuiz(null)
    setSubmitResult(null)
    setQuizAnswers({})
    navigate('/quiz')
  }

  const bestTopic = insights?.topic_mastery?.[0]
  const nextRecommendation = insights?.recommendations?.[0]
  const studyFocus = useMemo(() => {
    if (bestTopic) {
      return {
        title: `Focus on ${bestTopic.topic}`,
        description: `You are scoring ${Math.round(bestTopic.mastery_score)}% in this topic. Keep practicing to reinforce neural recall.`,
        tag: 'Strongest Topic',
      }
    }

    if (nextRecommendation) {
      return {
        title: `Review ${nextRecommendation.topic}`,
        description: nextRecommendation.reason,
        tag: nextRecommendation.priority,
      }
    }

    return {
      title: 'Ready for your first study sprint',
      description: 'Upload a PDF and generate an AI quiz to turn your notes into interactive practice sessions.',
      tag: 'Start Here',
    }
  }, [bestTopic, nextRecommendation])

  // Get current page meta for Navbar
  const pageMeta = useMemo(() => {
    const path = location.pathname
    if (path.includes('/dashboard')) return { title: 'Overview & Insights', subtitle: 'PROGRESS DASHBOARD' }
    if (path.includes('/documents')) return { title: 'Study Library', subtitle: 'MATERIAL INGESTION' }
    if (path.includes('/quiz')) return { title: 'Quiz Studio', subtitle: 'ACTIVE RECALL DRILL' }
    if (path.includes('/profile')) return { title: 'Learner Profile', subtitle: 'PERFORMANCE ANALYTICS' }
    return { title: 'Workspace', subtitle: 'LEARNIQ OS' }
  }, [location.pathname])

  if (!token && !isDemoMode) {
    return (
      <div className={darkMode ? 'theme-dark' : 'theme-light'}>
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
        <AuthView
          authMode={authMode}
          setAuthMode={setAuthMode}
          authForm={authForm}
          handleAuthChange={handleAuthChange}
          handleAuthSubmit={handleAuthSubmit}
          loading={loading}
          onQuickDemoLogin={handleQuickDemoLogin}
        />
      </div>
    )
  }

  return (
    <div className={`app-shell ${darkMode ? 'theme-dark' : 'theme-light'}`}>
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
      <Confetti active={showConfetti} />

      <Sidebar
        user={user}
        streak={insights?.streak_days || 4}
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode((prev) => !prev)}
        onLogout={handleLogout}
        isDemoMode={isDemoMode}
        onToggleDemo={() => {
          const next = !isDemoMode
          setIsDemoMode(next)
          localStorage.setItem('learniq-demo', next ? 'true' : 'false')
          if (next) {
            setUser(mockUser)
            setDocuments(mockDocuments)
            setInsights(mockInsights)
            setHistory(mockHistory)
            addToast('Switched to Interactive Demo Mode.', 'info')
          } else {
            loadSession()
            addToast('Switched to Live Backend Mode.', 'info')
          }
        }}
      />

      <div className="main-viewport">
        <Navbar
          title={pageMeta.title}
          subtitle={pageMeta.subtitle}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          user={user}
          isDemoMode={isDemoMode}
          llmInfo={llmInfo}
        />

        <main className="content-container">
          <Routes>
            <Route
              path="/dashboard"
              element={
                <DashboardView
                  documents={documents}
                  insights={insights}
                  history={history}
                  studyFocus={studyFocus}
                  bestTopic={bestTopic}
                  onLaunchPractice={handleLaunchPractice}
                  onNavigateTab={(tab) => navigate(tab)}
                />
              }
            />

            <Route
              path="/documents"
              element={
                <DocumentsView
                  documents={documents}
                  onUploadDocument={handleDocumentUpload}
                  isUploading={isUploading}
                  onGenerateFromDoc={handleLaunchPractice}
                />
              }
            />

            <Route
              path="/quiz"
              element={
                <QuizView
                  quizForm={quizForm}
                  setQuizForm={setQuizForm}
                  isDemoMode={isDemoMode}
                  handleQuizGenerate={handleQuizGenerate}
                  generatedQuiz={generatedQuiz}
                  quizAnswers={quizAnswers}
                  handleAnswerChange={handleAnswerChange}
                  handleSubmitQuiz={handleSubmitQuiz}
                  submitResult={submitResult}
                  loading={loading}
                  studyFocus={studyFocus}
                  history={history}
                  onResetQuiz={() => {
                    setGeneratedQuiz(null)
                    setSubmitResult(null)
                    setQuizAnswers({})
                  }}
                />
              }
            />

            <Route
              path="/profile"
              element={
                <ProfileView
                  user={user}
                  documents={documents}
                  insights={insights}
                  history={history}
                  onRetakeTopic={handleLaunchPractice}
                />
              }
            />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default App
