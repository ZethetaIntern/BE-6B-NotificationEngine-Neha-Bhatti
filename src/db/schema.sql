-- 0. Enable UUID Extension (Sabse zaroori line)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. User Preferences Table
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id VARCHAR(100) PRIMARY KEY,
    channels_enabled JSONB DEFAULT '{"email": true, "sms": true, "push": true, "whatsapp": true}',
    quiet_hours_start TIME DEFAULT '21:00:00',
    quiet_hours_end TIME DEFAULT '08:00:00',
    dnd_enabled BOOLEAN DEFAULT false,
    preferred_language VARCHAR(10) DEFAULT 'en'
);

-- 2. Core Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    channel VARCHAR(20) NOT NULL,
    priority VARCHAR(20) DEFAULT 'NORMAL',
    status VARCHAR(20) DEFAULT 'PENDING',
    payload JSONB NOT NULL,
    idempotency_key VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Notification State Log Table
CREATE TABLE IF NOT EXISTS notification_state_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
    previous_state VARCHAR(20),
    new_state VARCHAR(20) NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Dead Letter Queue Table
CREATE TABLE IF NOT EXISTS dead_letter_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID,
    payload JSONB NOT NULL,
    error_message TEXT NOT NULL,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Basic Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);