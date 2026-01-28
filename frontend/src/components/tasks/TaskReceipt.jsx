import React, { forwardRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Clock, Calendar, Hash, CheckSquare, AlignLeft, AlertCircle } from 'lucide-react';

const TaskReceipt = forwardRef(({ task, project }, ref) => {
    // Branding Colors (Matches Antigravity theme)
    const bgColor = '#0F172A'; // Slate 900
    const cardColor = '#1E293B'; // Slate 800
    const accentColor = '#3B82F6'; // Blue 500
    const textColor = '#F8FAFC'; // Slate 50

    const formattedDate = task.dueDate
        ? new Date(task.dueDate).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        : 'Sin fecha de vencimiento';

    return (
        <div ref={ref} style={{
            width: '600px', // Fixed width for consistent generation
            backgroundColor: bgColor,
            padding: '40px',
            fontFamily: 'Inter, sans-serif',
            color: textColor,
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            borderRadius: '0px' // Clean edges for image
        }}>
            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `2px solid ${cardColor}`, paddingBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ backgroundColor: accentColor, padding: '10px', borderRadius: '12px' }}>
                        <CheckSquare size={32} color="white" />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px' }}>Nueva Tarea</h1>
                        <p style={{ margin: 0, color: '#94A3B8', fontSize: '14px', fontWeight: 500 }}>Criterio Digital • ERP</p>
                    </div>
                </div>
                {/* Project Badge */}
                {project && (
                    <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: accentColor, padding: '8px 16px', borderRadius: '100px', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Hash size={16} />
                        {project.name}
                    </div>
                )}
            </div>

            {/* TASK TITLE */}
            <div style={{ backgroundColor: cardColor, padding: '24px', borderRadius: '16px', borderLeft: `6px solid ${accentColor}` }}>
                <h2 style={{ margin: 0, fontSize: '28px', lineHeight: '1.3', fontWeight: 700 }}>
                    {task.text}
                </h2>
            </div>

            {/* METADATA GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ backgroundColor: cardColor, padding: '20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Calendar color="#94A3B8" size={24} />
                    <div>
                        <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>Vencimiento</p>
                        <p style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{formattedDate}</p>
                    </div>
                </div>

                <div style={{ backgroundColor: cardColor, padding: '20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Clock color="#94A3B8" size={24} />
                    <div>
                        <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>Estado</p>
                        <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#FBBF24' }}>Pendiente</p>
                    </div>
                </div>
            </div>

            {/* DESCRIPTION */}
            <div style={{ backgroundColor: cardColor, padding: '24px', borderRadius: '16px', minHeight: '120px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <AlignLeft size={18} color="#94A3B8" />
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Descripción / Notas</span>
                </div>
                <div style={{ fontSize: '16px', lineHeight: '1.6', color: '#CBD5E1' }}>
                    <style>{`
                        .html-desc img { max-width: 100%; border-radius: 8px; margin-top: 12px; border: 1px solid #334155; }
                        .html-desc p { margin-bottom: 0.5em; }
                        .html-desc ul { list-style-type: disc; padding-left: 1.5em; }
                    `}</style>
                    {task.description ? (
                        (task.description.trim().startsWith('<')) ? (
                            <div
                                className="html-desc"
                                dangerouslySetInnerHTML={{ __html: task.description }}
                            />
                        ) : (
                            <ReactMarkdown
                                components={{
                                    img: ({ node, ...props }) => <img {...props} style={{ maxWidth: '100%', borderRadius: '8px', marginTop: '10px' }} />,
                                    p: ({ node, ...props }) => <p {...props} style={{ margin: '0 0 10px 0', whiteSpace: 'pre-wrap' }} />
                                }}
                            >
                                {task.description}
                            </ReactMarkdown>
                        )
                    ) : (
                        <p style={{ margin: 0 }}>Sin descripción detallada.</p>
                    )}
                </div>
            </div>

            {/* FOOTER */}
            <div style={{ paddingTop: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                    Generado automáticamente por Antigravity • app.criteriodigital.cl
                </p>
            </div>
        </div>
    );
});

export default TaskReceipt;
