/**
 * Service for interacting with the Google Tasks API.
 * Requires an accessToken with 'https://www.googleapis.com/auth/tasks' scope.
 */

// Helper to get the access token (OAuth credential)
// In a real app, you might store this in a more persistent secure way or use a backend.
// For this client-side demo, we'll try to retrieve it from the AuthCredential if available,
// or prompt the user to re-auth if needed. 
// NOTE: Firebase Auth token !== Google Access Token. We need the OAuth token.
// We'll pass the token explicitly to these functions.

export const googleTasksService = {

    /**
     * Lists all task lists for the user.
     * @param {string} accessToken 
     */
    async listTaskLists(accessToken) {
        if (!accessToken) throw new Error("No access token provided");

        const response = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Google Tasks API Error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.items || [];
    },

    /**
     * Lists tasks from a specific list.
     * @param {string} accessToken 
     * @param {string} taskListId 
     */
    async listTasks(accessToken, taskListId) {
        const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks?showCompleted=true&showHidden=true`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error("Failed to fetch tasks");
        const data = await response.json();
        return data.items || [];
    },

    /**
     * Creates a new task in the specified list.
     * @param {string} accessToken 
     * @param {string} taskListId 
     * @param {string} title 
     * @param {string} notes 
     */
    async createTask(accessToken, taskListId, title, notes = "") {
        const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: title,
                notes: notes
            })
        });

        if (!response.ok) throw new Error("Failed to create task");
        return await response.json();
    },

    /**
     * Updates an existing task (e.g. marking as complete).
     * @param {string} accessToken 
     * @param {string} taskListId 
     * @param {string} taskId 
     * @param {object} updates { status: 'completed' | 'needsAction', ... }
     */
    async updateTask(accessToken, taskListId, taskId, updates) {
        // First we might need the current task if we intend to patch, 
        // but the API supports PATCH behavior via simple update if we send the whole resource?
        // Google Tasks API uses PATCH for partial updates.

        const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });

        if (!response.ok) throw new Error("Failed to update task");
        return await response.json();
    }
};
