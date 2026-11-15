export const mockUser = {
  id: 1,
  name: 'Alex Rivera',
  email: 'alex.rivera@learniq.ai',
}

export const mockDocuments = [
  {
    id: 101,
    file_name: 'Deep_Learning_Architectures_2026.pdf',
    status: 'Ready',
    size_mb: '4.2 MB',
    pages: 28,
    uploaded_at: '2 hours ago',
    topics: ['Neural Networks', 'Backpropagation', 'Transformers'],
  },
  {
    id: 102,
    file_name: 'System_Design_Distributed_Systems.pdf',
    status: 'Ready',
    size_mb: '7.8 MB',
    pages: 45,
    uploaded_at: 'Yesterday',
    topics: ['CAP Theorem', 'Load Balancing', 'Consensus Algorithms'],
  },
  {
    id: 103,
    file_name: 'FastAPI_Production_Masterclass.pdf',
    status: 'Ready',
    size_mb: '2.1 MB',
    pages: 18,
    uploaded_at: '3 days ago',
    topics: ['AsyncIO', 'Dependency Injection', 'Pydantic V2'],
  },
]

export const mockInsights = {
  average_score: 84.5,
  total_attempts: 14,
  streak_days: 4,
  topic_mastery: [
    {
      topic: 'Neural Networks',
      mastery_score: 92.0,
      attempts: 6,
      latest_score: 95.0,
    },
    {
      topic: 'FastAPI Architecture',
      mastery_score: 86.0,
      attempts: 4,
      latest_score: 88.0,
    },
    {
      topic: 'Distributed Systems',
      mastery_score: 68.0,
      attempts: 3,
      latest_score: 70.0,
    },
    {
      topic: 'CAP Theorem',
      mastery_score: 45.0,
      attempts: 1,
      latest_score: 45.0,
    },
  ],
  recommendations: [
    {
      topic: 'CAP Theorem',
      priority: 'High Priority',
      reason: 'Your latest accuracy on consistency trade-offs was 45%. A 5-question sprint will lock in partition tolerance concepts.',
      mastery_score: 45.0,
    },
    {
      topic: 'Distributed Systems',
      priority: 'Recommended',
      reason: 'Revisit Raft and Paxos consensus models to elevate your score from 68% into mastery tier (85%+).',
      mastery_score: 68.0,
    },
  ],
}

export const mockHistory = [
  {
    attempt_id: 201,
    quiz_id: 1,
    topic: 'Neural Networks & Optimizers',
    score: 3.0,
    total_questions: 3,
    correct_answers: 3,
    percentage: 100.0,
    created_at: 'Today, 10:30 AM',
  },
  {
    attempt_id: 202,
    quiz_id: 2,
    topic: 'FastAPI Dependency Injection',
    score: 2.0,
    total_questions: 3,
    correct_answers: 2,
    percentage: 66.7,
    created_at: 'Yesterday, 4:15 PM',
  },
  {
    attempt_id: 203,
    quiz_id: 3,
    topic: 'Distributed Consensus & Raft',
    score: 4.0,
    total_questions: 5,
    correct_answers: 4,
    percentage: 80.0,
    created_at: 'Nov 12, 2:00 PM',
  },
]

export const sampleQuizzesByTopic = {
  'Neural Networks': {
    id: 301,
    topic: 'Neural Networks',
    difficulty: 'medium',
    questions: [
      {
        id: 1,
        question: 'What is the primary function of an activation function in a deep neural network?',
        options: [
          'Introduce non-linearity so the model can learn complex decision boundaries',
          'Normalize gradients during backpropagation to prevent exploding gradients',
          'Reduce the total number of trainable parameters in dense layers',
          'Convert continuous floating point numbers into discrete boolean logic',
        ],
        correct_answer: 'Introduce non-linearity so the model can learn complex decision boundaries',
        explanation: 'Without non-linear activation functions, stacked neural layers collapse mathematically into a single linear regression.',
      },
      {
        id: 2,
        question: 'Which optimizer adaptively calculates individual learning rates for different parameters using first and second moments of the gradients?',
        options: [
          'Adam (Adaptive Moment Estimation)',
          'Stochastic Gradient Descent (Vanilla SGD)',
          'Nesterov Momentum Optimizer',
          'Mini-batch Newton-Raphson',
        ],
        correct_answer: 'Adam (Adaptive Moment Estimation)',
        explanation: 'Adam computes exponential decaying averages of past gradients and past squared gradients for adaptive learning rates.',
      },
      {
        id: 3,
        question: 'What does the technique of "Dropout" achieve during training?',
        options: [
          'Regularizes the network to prevent overfitting by randomly deactivating neurons',
          'Prunes weights permanently to make the model run faster on mobile devices',
          'Discards low-resolution training images to speed up data loaders',
          'Stops training early when validation loss fails to improve for several epochs',
        ],
        correct_answer: 'Regularizes the network to prevent overfitting by randomly deactivating neurons',
        explanation: 'Dropout forces neurons to learn robust features without co-adapting with neighboring neurons.',
      },
    ],
  },
  'FastAPI Architecture': {
    id: 302,
    topic: 'FastAPI Architecture',
    difficulty: 'medium',
    questions: [
      {
        id: 11,
        question: 'How does FastAPI achieve high performance comparable to NodeJS and Go?',
        options: [
          'Built on Starlette (ASGI) and Pydantic with Python asynchronous event loops',
          'Precompiles Python bytecode into native C++ machine binaries at startup',
          'Executes all request routes in isolated multithreaded worker subprocesses',
          'Bypasses the Python Global Interpreter Lock (GIL) via raw Cython routines',
        ],
        correct_answer: 'Built on Starlette (ASGI) and Pydantic with Python asynchronous event loops',
        explanation: 'Starlette provides raw asynchronous ASGI throughput, while Pydantic handles lightning-fast schema validation.',
      },
      {
        id: 12,
        question: 'What is the recommended method to inject database sessions into endpoint handlers in FastAPI?',
        options: [
          'FastAPI Depends() dependency injection with yield session cleanup',
          'Global singleton database connection variable imported in router files',
          'Flask-style request context local hooks inside middleware',
          'Instantiating a new engine and connection pool on every HTTP call',
        ],
        correct_answer: 'FastAPI Depends() dependency injection with yield session cleanup',
        explanation: 'Depends() cleanly manages lifecycle, ensuring sessions are properly created, passed, and closed or rolled back.',
      },
      {
        id: 13,
        question: 'Which HTTP status code is idiomatic when a resource is successfully created via POST?',
        options: [
          '201 Created',
          '200 OK',
          '202 Accepted',
          '204 No Content',
        ],
        correct_answer: '201 Created',
        explanation: 'HTTP 201 indicates that the request succeeded and led to the creation of one or more new resources.',
      },
    ],
  },
}
