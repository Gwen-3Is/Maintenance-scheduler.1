// sw.js - Service Worker for background notifications
let schedules = [];
let checkInterval = null;

self.addEventListener('install', event => {
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('message', event => {
    if (event.data?.type === 'SYNC_SCHEDULES') {
        schedules = event.data.schedules || [];
        setupPreciseTimer();
    }
});

function setupPreciseTimer() {
    if (checkInterval) clearInterval(checkInterval);
    
    // Check every 5 seconds for precision
    checkInterval = setInterval(() => {
        const now = new Date();
        
        schedules.forEach(task => {
            if (task.notified || task.completed) return;
            
            const taskTime = new Date(task.date + 'T' + task.time);
            const diff = taskTime - now;
            
            // Trigger within 2 seconds window
            if (diff <= 2000 && diff > -5000) {
                showNotification(task);
            }
        });
        
        // Cleanup old tasks
        schedules = schedules.filter(s => {
            if (s.notified || s.completed) return true;
            const taskTime = new Date(s.date + 'T' + s.time);
            return taskTime > new Date() - 3600000;
        });
    }, 5000);
}

function showNotification(task) {
    task.notified = true;
    
    self.registration.showNotification(`🔧 ${task.computer} - Maintenance Due!`, {
        body: `${task.type} at ${task.time}\nTechnician: ${task.technician}`,
        icon: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
        tag: String(task.id),
        requireInteraction: true,
        vibrate: [200, 100, 200]
    });
    
    // Notify main thread
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                type: 'TASK_DUE',
                taskId: task.id
            });
        });
    });
}

self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then(clients => {
            if (clients.length > 0) {
                clients[0].focus();
            } else {
                self.clients.openWindow('/');
            }
        })
    );
});
