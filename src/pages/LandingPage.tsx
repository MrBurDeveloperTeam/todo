import React, { useState } from 'react';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  Layers,
  ListTodo,
  Menu,
  Sparkles,
  X,
} from 'lucide-react';
import { AuthForm } from '../components/AuthForm';
import { SNABBB_SIGNUP_URL } from '../constants/authLinks';
// @ts-expect-error CSS is loaded by the bundler; it has no TypeScript declaration.
import './todo-landing.css';

const features = [
  {
    icon: ListTodo,
    title: 'Efficient Task Lists',
    description:
      'Organise work clearly with a focused task list that keeps priorities visible and easy to manage.',
  },
  {
    icon: CalendarDays,
    title: 'Dynamic Calendar',
    description:
      'Move between month, week, and day views to understand your schedule at a glance.',
  },
  {
    icon: Bell,
    title: 'Intelligent Reminders',
    description:
      'Set time-based reminders and see overdue alerts directly inside your workspace.',
  },
  {
    icon: FileText,
    title: 'Rich Descriptions',
    description:
      'Add notes, links, and context to every item without navigating through complicated forms.',
  },
  {
    icon: Sparkles,
    title: 'Quick Add Engine',
    description:
      'Type a task and press Enter to add it instantly. Use the full form whenever you need more detail.',
  },
  {
    icon: Layers,
    title: 'Personalised Workspace',
    description:
      'Choose your accent colour and create a workspace that feels like your own.',
  },
];

const faqs = [
  {
    question: 'Do I need an account to use the workspace?',
    answer:
      'No. You can open the workspace without signing up. Your local session and preferences are stored in your browser.',
  },
  {
    question: 'Can I view tasks and calendar events together?',
    answer:
      'Yes. The workspace combines tasks, events, and reminders so you can understand your work in one place.',
  },
  {
    question: 'Can I add detailed descriptions to tasks?',
    answer:
      'Yes. Every item can include detailed notes, links, and supporting context.',
  },
  {
    question: 'Can I change the workspace colour?',
    answer:
      'Yes. Choose from the available accent colours in the Personalised Workspace section.',
  },
];

function TodoPreview() {
  const tasks = [
    { title: 'Review Q3 performance report', type: 'Task', date: 'Tomorrow' },
    { title: 'Team standup meeting', type: 'Event', date: '10:00 AM' },
    { title: 'Pay bills', type: 'Reminder', date: 'Overdue', overdue: true },
    { title: 'Doctor appointment', type: 'Event', date: 'Thu 14:00' },
  ];

  return (
    <div className="todo-preview-shell">
      <div className="todo-browser-bar">
        <div className="todo-browser-dots">
          <span className="todo-dot todo-dot-red" />
          <span className="todo-dot todo-dot-yellow" />
          <span className="todo-dot todo-dot-green" />
        </div>

        <div className="todo-browser-address">
          to-do-manager.app/my-tasks
        </div>
      </div>

      <div className="todo-preview-app">
        <aside className="todo-preview-sidebar">
          <div className="todo-preview-brand">
            <div className="todo-preview-mark">T</div>
            <span>To-do manager</span>
          </div>

          <div className="todo-preview-nav todo-preview-nav-active">
            <ListTodo size={15} />
            <span>My Tasks</span>
            <strong>12</strong>
          </div>

          <div className="todo-preview-nav">
            <CalendarDays size={15} />
            <span>Upcoming</span>
          </div>

          <div className="todo-preview-nav">
            <Layers size={15} />
            <span>Projects</span>
          </div>

          <div className="todo-preview-divider" />

          <div className="todo-preview-label">Categories</div>

          <div className="todo-preview-category">
            <span className="todo-category-dot todo-category-blue" />
            Personal
          </div>

          <div className="todo-preview-category">
            <span className="todo-category-dot todo-category-purple" />
            Work
          </div>
        </aside>

        <div className="todo-preview-content">
          <div className="todo-preview-toolbar">
            <strong>My Tasks</strong>

            <div className="todo-preview-toolbar-actions">
              <div className="todo-preview-search">Search tasks...</div>
              <button className="todo-preview-add">
                <span>+</span>
                New Item
              </button>
            </div>
          </div>

          <div className="todo-preview-main">
            <div className="todo-preview-task-list">
              <div className="todo-preview-filters">
                <span className="todo-filter-active">All</span>
                <span>Tasks</span>
                <span>Events</span>
              </div>

              {tasks.map((task, index) => (
                <div
                  className={`todo-preview-task ${
                    index === 0 ? 'todo-preview-task-selected' : ''
                  }`}
                  key={task.title}
                >
                  <span className="todo-task-check" />
                  <span className="todo-task-title">{task.title}</span>
                  <span className="todo-task-type">{task.type}</span>
                  <span
                    className={
                      task.overdue
                        ? 'todo-task-date todo-task-overdue'
                        : 'todo-task-date'
                    }
                  >
                    {task.date}
                  </span>
                </div>
              ))}
            </div>

            <div className="todo-preview-details">
              <strong>Performance Audit</strong>

              <div className="todo-detail-block">
                <span>Details</span>
                <p>
                  Full review of conversion metrics and user retention
                  strategies.
                </p>
              </div>

              <div className="todo-detail-columns">
                <div>
                  <span>Priority</span>
                  <strong className="todo-priority">
                    <i />
                    High
                  </strong>
                </div>

                <div>
                  <span>Due Date</span>
                  <strong>May 12, 2026</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingPage({
  onStart,
  onAuthFormActiveChange,
}: {
  onStart: () => void;
  onAuthFormActiveChange?: (isActive: boolean) => void;
}) {
  const [authMode, setAuthMode] = useState<'landing' | 'login' | 'signup'>(
    'landing',
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const openLogin = () => {
    setMenuOpen(false);
    setAuthMode('login');
  };

  const openSignup = () => {
    setMenuOpen(false);
    setAuthMode('signup');
  };

  const handleBack = () => {
    setAuthMode('landing');
    onAuthFormActiveChange?.(false);
  };

  if (authMode !== 'landing') {
    onAuthFormActiveChange?.(true);

    return (
      <div className="todo-auth-page">
        <AuthForm
          mode={authMode === 'signup' ? 'signup' : 'login'}
          onBack={handleBack}
          onSwitchMode={(nextMode) => setAuthMode(nextMode)}
        />
      </div>
    );
  }

  return (
    <main className="todo-landing">
      <nav className="todo-nav">
        <a
          className="todo-brand"
          href="#top"
          aria-label="To-do manager home"
        >
          <img src="/Logo/snabbb-teal.png" alt="Snabbb" />
          <span>To-do manager</span>
        </a>

        <div className={`todo-nav-links ${menuOpen ? 'todo-nav-open' : ''}`}>
          <a href="#features" onClick={() => setMenuOpen(false)}>
            Features
          </a>

          <a href="#workflow" onClick={() => setMenuOpen(false)}>
            How It Works
          </a>

          <a href="#faq" onClick={() => setMenuOpen(false)}>
            FAQ
          </a>

          <div className="todo-mobile-actions">
            <button onClick={openLogin}>Log In</button>
            <button onClick={openSignup}>Sign Up</button>
          </div>
        </div>

        <div className="todo-nav-actions">
          <button className="todo-login" onClick={openLogin}>
            Log In
          </button>

          <a className="todo-nav-cta" href={SNABBB_SIGNUP_URL}>
            Sign Up
            <ArrowRight size={17} />
          </a>
        </div>

        <button
          className="todo-menu-button"
          onClick={() => setMenuOpen((current) => !current)}
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={23} /> : <Menu size={23} />}
        </button>
      </nav>

      <section id="top" className="todo-hero">
        <div className="todo-hero-copy">
          <div className="todo-eyebrow">
            <span className="todo-live-dot" />
            Now available — completely free
          </div>

          <h1>
            Your tasks,
            <em> your calendar,</em>
            <span> one place.</span>
          </h1>

          <p>
            To-do manager brings together tasks, events, and reminders in a
            single beautiful workspace. High-fidelity calendar. In-depth
            descriptions. Your own aesthetic.
          </p>

          <div className="todo-hero-actions">
            <button className="todo-primary-button" onClick={openSignup}>
              Join Us
              <ArrowRight size={18} />
            </button>

            <a className="todo-secondary-button" href="#features">
              Explore Features
            </a>
          </div>

          <div className="todo-trust-row">
            <span>
              <CheckCircle2 size={16} />
              No account needed
            </span>

            <span>
              <CheckCircle2 size={16} />
              Runs in your browser
            </span>

            <span>
              <CheckCircle2 size={16} />
              Data stays on your device
            </span>
          </div>
        </div>

        <div className="todo-hero-preview">
          <div className="todo-preview-glow todo-preview-glow-one" />
          <div className="todo-preview-glow todo-preview-glow-two" />

          <TodoPreview />

          <div className="todo-floating-card todo-floating-reminder">
            <Clock3 size={18} />
            <div>
              <strong>Upcoming reminder</strong>
              <span>Team standup at 10:00 AM</span>
            </div>
          </div>

          <div className="todo-floating-card todo-floating-complete">
            <CheckCircle2 size={18} />
            <span>Task completed</span>
          </div>
        </div>
      </section>

      <section className="todo-stat-strip">
        <div>
          <strong>1</strong>
          <span>connected workspace</span>
        </div>

        <div>
          <strong>3</strong>
          <span>work views</span>
        </div>

        <div>
          <strong>6</strong>
          <span>accent colours</span>
        </div>

        {/* <div>
          <strong>0</strong>
          <span>signup friction</span>
        </div> */}
      </section>

      <section id="features" className="todo-section todo-features">
        <div className="todo-section-heading">
          <div className="todo-section-label">Core ecosystem</div>
          <h2>Everything you need to stay in motion.</h2>
          <p>
            Tasks, calendar events, reminders, and descriptions come together
            in one focused workspace.
          </p>
        </div>

        <div className="todo-feature-grid">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <article className="todo-feature-card" key={feature.title}>
                <div className="todo-feature-icon">
                  <Icon size={22} />
                </div>

                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="workflow" className="todo-workflow">
        <div className="todo-section-heading">
          <div className="todo-section-label">Simple workflow</div>
          <h2>From thought to done.</h2>
          <p>
            Keep the process simple and make progress visible without adding
            unnecessary steps.
          </p>
        </div>

        <div className="todo-workflow-grid">
          <div>
            <span>01</span>
            <strong>Add</strong>
            <p>Capture a task, event, or reminder in seconds.</p>
          </div>

          <div>
            <span>02</span>
            <strong>Organise</strong>
            <p>Add dates, descriptions, categories, and priority.</p>
          </div>

          <div>
            <span>03</span>
            <strong>Execute</strong>
            <p>Use your task list and calendar to keep moving.</p>
          </div>
        </div>
      </section>

      <section id="faq" className="todo-section todo-faq">
        <div className="todo-section-heading">
          <div className="todo-section-label">Questions</div>
          <h2>Good to know.</h2>
          <p>Some quick answers about the to-do workspace.</p>
        </div>

        <div className="todo-faq-list">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;

            return (
              <div className={`todo-faq-item ${isOpen ? 'is-open' : ''}`} key={faq.question}>
                <button
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  aria-expanded={isOpen}
                >
                  <span>{faq.question}</span>
                  <ChevronDown size={19} />
                </button>

                {isOpen && (
                  <div className="todo-faq-answer">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="todo-final-cta">
        <div>
          <div className="todo-section-label">Ready when you are</div>
          <h2>Make space for better work.</h2>
          <p>
            Open your workspace, organise your next move, and get started
            without friction.
          </p>
        </div>

        <button className="todo-primary-button todo-light-button" onClick={onStart}>
          Open Workspace
          <ArrowRight size={18} />
        </button>
      </section>

      <footer className="todo-footer">
        <a className="todo-brand" href="#top">
          <img src="/Logo/snabbb-teal.png" alt="Snabbb" />
          <span>To-do manager</span>
        </a>

        <p>Clearer planning for focused work.</p>

        <div className="todo-footer-links">
          <a href="#features">Features</a>
          <a href="#workflow">How It Works</a>
          <a href="#faq">FAQ</a>
        </div>
      </footer>
    </main>
  );
}