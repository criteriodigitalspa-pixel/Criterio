import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import es from 'date-fns/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useState, useMemo } from 'react';

const locales = {
    'es': es,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

export default function CalendarView({ tasks, onTaskClick }) {
    const [view, setView] = useState('month');

    // Transform tasks to events
    const events = useMemo(() => {
        return tasks
            .filter(t => t.dueDate && !isNaN(new Date(t.dueDate).getTime())) // Only tasks with valid dates
            .map(t => {
                // Parse YYYY-MM-DD
                const date = new Date(t.dueDate);
                // Adjust to be all-day (react-big-calendar handles it better)
                // We add a few hours to ensure it falls on the day correctly in all TZs if needed, 
                // but usually YYYY-MM-DD parsed is local midnight or UTC.
                // Let's force it to be "noon" to avoid boundary issues, or just use allDay=true.
                date.setHours(12, 0, 0, 0);

                return {
                    id: t.id,
                    title: t.text,
                    start: date,
                    end: date,
                    allDay: true,
                    resource: t,
                    status: t.status
                };
            });
    }, [tasks]);

    const eventStyleGetter = (event) => {
        let backgroundColor = '#3b82f6'; // blue-500
        if (event.status === 'done') backgroundColor = '#22c55e'; // green-500
        if (event.status === 'in-progress') backgroundColor = '#f59e0b'; // amber-500

        return {
            style: {
                backgroundColor,
                borderRadius: '6px',
                border: 'none',
                color: 'white',
                fontSize: '0.85rem',
                padding: '2px 5px'
            }
        };
    };

    return (
        <div className="h-full w-full p-4 bg-gray-900 text-gray-200">
            <style>
                {`
                    .rbc-calendar { font-family: inherit; }
                    /* Main Grid & Background */
                    .rbc-month-view, .rbc-time-view, .rbc-agenda-view { border: 1px solid rgba(255, 255, 255, 0.08); background: transparent; }
                    
                    /* Headers */
                    .rbc-header { 
                        border-bottom: 1px solid rgba(255, 255, 255, 0.08); 
                        padding: 12px 0; 
                        font-weight: 600; 
                        text-transform: uppercase; 
                        font-size: 0.7rem; 
                        letter-spacing: 0.05em;
                        color: #6b7280; 
                    }
                    
                    /* Grid Lines */
                    .rbc-day-bg + .rbc-day-bg { border-left: 1px solid rgba(255, 255, 255, 0.04); }
                    .rbc-month-row + .rbc-month-row { border-top: 1px solid rgba(255, 255, 255, 0.04); }
                    .rbc-time-header-content { border-left: 1px solid rgba(255, 255, 255, 0.04); }
                    .rbc-time-content { border-top: 1px solid rgba(255, 255, 255, 0.04); }
                    .rbc-timeslot-group { border-bottom: 1px solid rgba(255, 255, 255, 0.04); }
                    .rbc-day-slot .rbc-time-slot { border-top: 1px solid rgba(255, 255, 255, 0.02); }
                    
                    /* Cells */
                    .rbc-off-range-bg { background: rgba(0, 0, 0, 0.2); }
                    .rbc-date-cell { padding: 8px; font-size: 0.85rem; color: #9ca3af; font-weight: 500; }
                    .rbc-event { padding: 1px 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.2); }
                    
                    /* Today Highlight */
                    .rbc-today { background-color: rgba(59, 130, 246, 0.05); }
                    
                    /* Time Indicator */
                    .rbc-current-time-indicator { background-color: #3b82f6; height: 2px; }
                    
                    /* Toolbar Overrides (buttons are styled globally generally but just in case) */
                    .rbc-toolbar button { color: #9ca3af; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; }
                    .rbc-toolbar button:hover { background-color: rgba(255,255,255,0.05); color: white; }
                    .rbc-toolbar button.rbc-active { background-color: #2563eb; color: white; border-color: #2563eb; }
                `}
            </style>
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 'calc(100vh - 140px)' }} // Adjust based on header height
                views={['month', 'week', 'agenda']}
                view={view}
                onView={setView}
                culture='es'
                messages={{
                    next: 'Siguiente',
                    previous: 'Anterior',
                    today: 'Hoy',
                    month: 'Mes',
                    week: 'Semana',
                    day: 'Día',
                    agenda: 'Agenda',
                    date: 'Fecha',
                    time: 'Hora',
                    event: 'Evento',
                    noEventsInRange: 'No hay tareas en este rango.',
                }}
                eventPropGetter={eventStyleGetter}
                onSelectEvent={(event) => onTaskClick(event.resource)}
            />
        </div>
    );
}
