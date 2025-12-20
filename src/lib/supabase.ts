import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://anyhqbqgzpcktohphxhn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFueWhxYnFnenBja3RvaHBoeGhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTAyMTUsImV4cCI6MjA4MTgyNjIxNX0.7GWbNKGAez_dsMgMfLJhicHGylsSS6DpZGPt1mcbhTc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Generate or retrieve device ID for sync
export function getDeviceId(): string {
    let deviceId = localStorage.getItem('focusflow_device_id');
    if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem('focusflow_device_id', deviceId);
    }
    return deviceId;
}

// Sync data to cloud
export async function syncToCloud(data: {
    projects: unknown[];
    tasks: unknown[];
    settings: unknown;
}) {
    const deviceId = getDeviceId();

    const { error } = await supabase
        .from('sync_data')
        .upsert({
            device_id: deviceId,
            projects: data.projects,
            tasks: data.tasks,
            settings: data.settings,
            updated_at: new Date().toISOString(),
        }, {
            onConflict: 'device_id'
        });

    if (error) {
        console.error('Sync to cloud failed:', error);
        throw new Error(`Sync failed: ${error.message}`);
    }

    return { success: true };
}

// Get all synced devices
export async function getSyncedDevices() {
    const { data, error } = await supabase
        .from('sync_data')
        .select('device_id, updated_at')
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Failed to get devices:', error);
        return [];
    }

    return data || [];
}

// Pull data from another device
export async function pullFromDevice(deviceId: string) {
    const { data, error } = await supabase
        .from('sync_data')
        .select('*')
        .eq('device_id', deviceId)
        .single();

    if (error) {
        console.error('Pull from device failed:', error);
        throw new Error(`Pull failed: ${error.message}`);
    }

    return {
        projects: data.projects || [],
        tasks: data.tasks || [],
        settings: data.settings || {},
    };
}

// Get latest sync from any device
export async function pullLatestSync() {
    const { data, error } = await supabase
        .from('sync_data')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            // No data found - that's okay
            return null;
        }
        console.error('Pull latest failed:', error);
        throw new Error(`Pull failed: ${error.message}`);
    }

    return {
        deviceId: data.device_id,
        projects: data.projects || [],
        tasks: data.tasks || [],
        settings: data.settings || {},
        updatedAt: data.updated_at,
    };
}
