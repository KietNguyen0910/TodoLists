import { useEffect, useRef, useState } from 'react';
import { formatDate } from '../../../shared/utils/dateUtils';
import { getStatusLabel } from '../../../shared/config/statusConfig';

export default function NotificationBell({ notifications, unreadCount, onOpen, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleOpen = () => {
    setIsOpen((open) => {
      const nextOpen = !open;
      if (nextOpen) onOpen();
      return nextOpen;
    });
  };

  const handleSelect = (notification) => {
    setIsOpen(false);
    onSelect(notification.task._id);
  };

  return (
    <div className="notification" ref={containerRef}>
      <button className="notification-button" type="button" aria-label="Notifications" aria-expanded={isOpen} onClick={toggleOpen}>
        <span className='' style={{ filter: 'invert(1)' }} aria-hidden="true">&#128276;</span>
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>
      {isOpen && (
        <div className="notification-panel" role="menu">
          <div className="notification-panel-header">
            <strong>Notifications</strong>
            <span>{notifications.length}</span>
          </div>
          {notifications.length === 0 ? (
            <p className="notification-empty">No overdue waiting tasks.</p>
          ) : (
            <div className="notification-list">
              {notifications.map((notification) => (
                <button className="notification-item" type="button" key={notification.id} onClick={() => handleSelect(notification)}>
                  <span className="notification-item-title">{notification.task.title || '_'}</span>
                  <span>{notification.task.description || 'No task'}</span>
                  <span className="notification-item-meta">
                    {getStatusLabel(notification.task.status)} - Assign {formatDate(notification.task.assignDate)} - {notification.daysWaiting} days waiting
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
