import { useEffect, useMemo, useState } from 'react'
import {
  Bell,
  Search,
  ArrowUpRight,
  X,
} from 'lucide-react'

import { useApp } from '../../store/AppContext'
import API_BASE from '../../config/api.js'
import Button from '../../components/ui/Button'
import StudentProfile from '../profile/StudentProfile'

export default function Home() {
  const { state, toast, dispatch } = useApp()

  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [showAllMatches, setShowAllMatches] = useState(false)
  const [showAllEvents, setShowAllEvents] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)

  const [students, setStudents] = useState([])
  const [events, setEvents] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [studentsError, setStudentsError] = useState('')
  const [eventsError, setEventsError] = useState('')
  const [connectingIds, setConnectingIds] = useState([])

  useEffect(() => {
    if (!state.token) {
      setStudents([])
      setEvents([])
      setStudentsError('')
      setEventsError('')
      setLoadingStudents(false)
      setLoadingEvents(false)
      return
    }

    const controller = new AbortController()

    async function loadData() {
      setLoadingStudents(true)
      setLoadingEvents(true)
      setStudentsError('')
      setEventsError('')

      const headers = {
        Accept: 'application/json',
        Authorization: `Bearer ${state.token}`,
      }

      async function getData(path) {
        const response = await fetch(`${API_BASE}${path}`, {
          headers,
          signal: controller.signal,
        })

        const data = await response.json().catch(() => null)

        if (!response.ok) {
          throw new Error(
            data?.detail || `Request failed (HTTP ${response.status})`
          )
        }

        return data
      }

      try {
        const data = await getData('/students')
        setStudents(Array.isArray(data) ? data : [])
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Loading students failed:', error)
          setStudentsError(error.message || 'Could not load students.')
          setStudents([])
        }
      } finally {
        if (!controller.signal.aborted) setLoadingStudents(false)
      }

      try {
        const data = await getData('/events/')
        setEvents(
          (Array.isArray(data) ? data : []).map((event) => ({
            ...event,
            when: event.when || `${event.event_date} · ${event.event_time}`,
          }))
        )
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Loading events failed:', error)
          setEventsError(error.message || 'Could not load events.')
          setEvents([])
        }
      } finally {
        if (!controller.signal.aborted) setLoadingEvents(false)
      }
    }

    loadData()

    return () => controller.abort()
  }, [state.token, state.user?.id])

  const searchResults = useMemo(() => {
    const text = query.trim().toLowerCase()

    const filteredStudents = students.filter((student) =>
      `${student.name || ''} ${student.common || ''} ${student.bio || ''}`
        .toLowerCase()
        .includes(text)
    )

    const filteredEvents = events.filter((event) =>
      `${event.title || ''} ${event.when || ''} ${event.venue || ''} ${event.description || ''}`
        .toLowerCase()
        .includes(text)
    )

    return {
      matches: filteredStudents,
      events: filteredEvents,
    }
  }, [query, students, events])

  const visibleMatches = showAllMatches
    ? searchResults.matches
    : searchResults.matches.slice(0, 2)

  const visibleEvents = showAllEvents
    ? searchResults.events
    : searchResults.events.slice(0, 2)

  const hasSearch = query.trim().length > 0

  const openStudentProfile = (student) => {
    setSelectedStudent(student)
  }

  const sendConnectionRequest = async (student) => {
    if (!state.token) {
      toast('Please log in to connect with students.')
      return
    }

    if (connectingIds.includes(student.id)) return

    setConnectingIds((previous) => [...previous, student.id])

    try {
      const response = await fetch(`${API_BASE}/connections/request`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${state.token}`,
        },
        body: JSON.stringify({ receiver_id: student.id }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          data?.detail || `Connection request failed (HTTP ${response.status})`
        )
      }

      toast(`Connection request sent to ${student.name}.`)
    } catch (error) {
      console.error('Sending connection request failed:', error)
      toast(error.message || 'Could not send connection request.')
    } finally {
      setConnectingIds((previous) =>
        previous.filter((id) => id !== student.id)
      )
    }
  }

  if (selectedStudent) {
    return (
      <StudentProfile
        student={selectedStudent}
        onBack={() => setSelectedStudent(null)}
        onConnect={() => sendConnectionRequest(selectedStudent)}
        connecting={connectingIds.includes(selectedStudent.id)}
      />
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-medium text-gray-500">
            Welcome back
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight text-campus-black">
            What's good, {state.user?.name || 'there'}?
          </h2>
        </div>

        <button
          aria-label="Notifications"
          onClick={() => toast('No new notifications')}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-campus-border bg-white transition hover:bg-campus-gray active:scale-95"
        >
          <Bell size={20} />
        </button>
      </header>

      {searchOpen ? (
        <div className="flex min-h-[52px] w-full items-center gap-3 rounded-full border border-campus-black bg-campus-gray px-5">
          <Search size={19} className="shrink-0 text-campus-muted" />
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setShowAllMatches(true)
              setShowAllEvents(true)
            }}
            placeholder="Search students and events"
            className="min-w-0 flex-1 bg-transparent text-sm text-campus-black outline-none placeholder:text-campus-muted"
          />
          <button
            aria-label="Close search"
            onClick={() => {
              setQuery('')
              setSearchOpen(false)
              setShowAllMatches(false)
              setShowAllEvents(false)
            }}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white transition hover:bg-campus-border active:scale-95"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setSearchOpen(true)}
          className="flex min-h-[52px] w-full items-center gap-3 rounded-full border border-campus-border bg-campus-gray px-5 text-left text-sm text-campus-muted transition hover:border-campus-black active:scale-[0.99]"
        >
          <Search size={19} />
          <span>Search students and events</span>
        </button>
      )}

      {hasSearch && (
        <section className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-campus-muted">
              Search
            </p>
            <h3 className="mt-1 text-xl font-bold text-campus-black">
              Results for "{query}"
            </h3>
          </div>

          {searchResults.matches.length === 0 &&
          searchResults.events.length === 0 &&
          !loadingStudents &&
          !loadingEvents ? (
            <div className="rounded-campus border border-campus-border bg-campus-gray p-6 text-center">
              <Search size={28} className="mx-auto text-campus-muted" />
              <p className="mt-3 font-bold text-campus-black">Nothing found</p>
              <p className="mt-1 text-sm text-campus-muted">
                Try another student or event name.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <p className="text-sm font-bold text-campus-black">Students</p>
                {loadingStudents && (
                  <p className="text-sm text-campus-muted">Loading students…</p>
                )}
                {studentsError && (
                  <p className="text-sm text-red-600">{studentsError}</p>
                )}
                {searchResults.matches.map((student) => (
                  <div
                    key={student.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openStudentProfile(student)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        openStudentProfile(student)
                      }
                    }}
                    className="flex cursor-pointer items-center gap-4 rounded-campus border border-campus-border bg-white p-4 shadow-campus transition hover:shadow-campus-hover"
                  >
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-campus-lime font-bold text-campus-black">
                      {student.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-campus-black">{student.name}</p>
                      <p className="mt-1 text-sm text-campus-muted">
                        {student.common || [student.college, student.course, student.year].filter(Boolean).join(' · ') || 'Campus student'}
                      </p>
                    </div>
                    <ArrowUpRight size={18} />
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-bold text-campus-black">Events</p>
                {loadingEvents && (
                  <p className="text-sm text-campus-muted">Loading events…</p>
                )}
                {eventsError && (
                  <p className="text-sm text-red-600">{eventsError}</p>
                )}
                {searchResults.events.map((event) => (
                  <div key={event.id} className="rounded-campus border border-campus-border bg-campus-yellow p-4">
                    <p className="font-bold text-campus-black">{event.title}</p>
                    <p className="mt-1 text-sm text-campus-black/70">{event.when}</p>
                    <p className="text-sm text-campus-black/70">{event.venue}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {!hasSearch && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-campus-muted">
                Connect
              </p>
              <h3 className="text-xl font-bold text-campus-black">
                Campus students
              </h3>
            </div>
            <button
              onClick={() => setShowAllMatches((value) => !value)}
              className="text-sm font-semibold text-campus-black hover:underline"
            >
              {showAllMatches ? 'Show less' : 'See all'}
            </button>
          </div>

          {loadingStudents && (
            <p className="text-sm text-campus-muted">Loading students…</p>
          )}
          {studentsError && (
            <p className="rounded-campus bg-red-50 p-4 text-sm text-red-700">
              {studentsError}
            </p>
          )}
          {!loadingStudents && !studentsError && visibleMatches.length === 0 && (
            <p className="rounded-campus border border-campus-border bg-white p-5 text-sm text-campus-muted">
              {state.token
                ? 'No other students are available yet.'
                : 'Log in to see students from the CampusX database.'}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {visibleMatches.map((student) => (
              <div
                key={student.id}
                role="button"
                tabIndex={0}
                onClick={() => openStudentProfile(student)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    openStudentProfile(student)
                  }
                }}
                className="group cursor-pointer rounded-campus border border-campus-border bg-white p-5 shadow-campus transition hover:-translate-y-1 hover:shadow-campus-hover active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-campus-lime font-bold text-campus-black">
                    {student.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <button
                    aria-label={`View ${student.name}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      openStudentProfile(student)
                    }}
                    className="grid h-9 w-9 place-items-center rounded-full bg-campus-gray transition group-hover:bg-campus-yellow active:scale-95"
                  >
                    <ArrowUpRight size={17} />
                  </button>
                </div>

                <div className="mt-4 text-left">
                  <p className="font-bold text-campus-black">{student.name}</p>
                  <p className="mt-1 text-sm text-campus-muted">
                    {student.common || [student.college, student.course, student.year].filter(Boolean).join(' · ') || 'Campus student'}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-end">
                  <Button
                    variant="gold"
                    disabled={connectingIds.includes(student.id)}
                    onClick={(event) => {
                      event.stopPropagation()
                      sendConnectionRequest(student)
                    }}
                  >
                    {connectingIds.includes(student.id) ? 'Sending…' : 'Connect'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!hasSearch && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-campus-muted">
                Campus
              </p>
              <h3 className="text-xl font-bold text-campus-black">Upcoming events</h3>
            </div>
            <button
              onClick={() => setShowAllEvents((value) => !value)}
              className="text-sm font-semibold text-campus-black hover:underline"
            >
              {showAllEvents ? 'Show less' : 'See all'}
            </button>
          </div>

          {loadingEvents && (
            <p className="text-sm text-campus-muted">Loading events…</p>
          )}
          {eventsError && (
            <p className="rounded-campus bg-red-50 p-4 text-sm text-red-700">
              {eventsError}
            </p>
          )}
          {!loadingEvents && !eventsError && visibleEvents.length === 0 && (
            <p className="rounded-campus border border-campus-border bg-white p-5 text-sm text-campus-muted">
              {state.token
                ? 'No events have been created yet.'
                : 'Log in to view events from the CampusX database.'}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {visibleEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-campus border border-campus-border bg-campus-yellow p-5 transition hover:-translate-y-1"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-campus-black">{event.title}</p>
                    <p className="mt-2 text-sm text-campus-black/70">{event.when}</p>
                    <p className="text-sm text-campus-black/70">{event.venue}</p>
                    {event.description && (
                      <p className="mt-2 text-sm text-campus-black/70">
                        {event.description}
                      </p>
                    )}
                  </div>
                  <ArrowUpRight size={18} className="shrink-0" />
                </div>
                {event.registration_status && (
                  <p className="mt-4 text-xs font-bold text-campus-black">
                    Your request: {event.registration_status}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
