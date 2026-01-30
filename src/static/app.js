document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper to escape HTML in participant strings
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and current options
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants section with delete buttons
        let participantsHtml;
        if (details.participants && details.participants.length > 0) {
          const items = details.participants
            .map((p) => `<li class="participant-item">${escapeHtml(p)} <button class="delete-btn" data-email="${escapeHtml(p)}" data-activity="${escapeHtml(name)}" title="Unregister" aria-label="Unregister ${escapeHtml(p)} from ${escapeHtml(name)}">🗑️</button></li>`)
            .join("");
          participantsHtml = `
            <div class="participants-section">
              <h5>Participants</h5>
              <ul class="participants-list">
                ${items}
              </ul>
            </div>
          `;
        } else {
          participantsHtml = `
            <div class="participants-section">
              <h5>Participants</h5>
              <p class="no-participants">No participants yet. Be the first to sign up!</p>
            </div>
          `;
        }

        activityCard.innerHTML = `
          <h3>${escapeHtml(name)}</h3>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHtml}
        `;

        activitiesList.appendChild(activityCard);

        // Add event listeners for delete buttons within this card
        activityCard.querySelectorAll('.delete-btn').forEach(button => {
          button.addEventListener('click', async (event) => {
            const email = event.currentTarget.dataset.email;
            const activityName = event.currentTarget.dataset.activity;
            // Confirm before unregistering
            const confirmed = window.confirm(`Unregister ${email} from ${activityName}?`);
            if (!confirmed) return;
            try {
              const response = await fetch(`/activities/${encodeURIComponent(activityName)}/participants/${encodeURIComponent(email)}`, {
                method: 'DELETE'
              });
              if (response.ok) {
                fetchActivities(); // Refresh the list
              } else {
                messageDiv.textContent = 'Failed to unregister participant.';
                messageDiv.className = 'error';
                messageDiv.classList.remove('hidden');
                setTimeout(() => messageDiv.classList.add('hidden'), 5000);
              }
            } catch (err) {
              console.error('Error unregistering participant:', err);
            }
          });
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Optimistically update the UI so the user sees the new participant immediately
        const selectedActivity = activity;
        const cards = Array.from(activitiesList.querySelectorAll('.activity-card'));
        const card = cards.find(c => c.querySelector('h3') && c.querySelector('h3').innerText === selectedActivity);
        if (card) {
          const ul = card.querySelector('.participants-list');
          if (ul) {
            const li = document.createElement('li');
            li.className = 'participant-item';
            li.innerHTML = `${escapeHtml(email)} <button class="delete-btn" data-email="${escapeHtml(email)}" data-activity="${escapeHtml(selectedActivity)}" title="Unregister" aria-label="Unregister ${escapeHtml(email)} from ${escapeHtml(selectedActivity)}">🗑️</button>`;
            ul.appendChild(li);

            // Attach the same delete handler used elsewhere
            const btn = li.querySelector('.delete-btn');
            btn.addEventListener('click', async (event) => {
              const emailToRemove = event.currentTarget.dataset.email;
              const activityName = event.currentTarget.dataset.activity;
              const confirmed = window.confirm(`Unregister ${emailToRemove} from ${activityName}?`);
              if (!confirmed) return;
              try {
                const resp = await fetch(`/activities/${encodeURIComponent(activityName)}/participants/${encodeURIComponent(emailToRemove)}`, { method: 'DELETE' });
                if (resp.ok) {
                  fetchActivities();
                } else {
                  messageDiv.textContent = 'Failed to unregister participant.';
                  messageDiv.className = 'error';
                  messageDiv.classList.remove('hidden');
                  setTimeout(() => messageDiv.classList.add('hidden'), 5000);
                }
              } catch (err) {
                console.error('Error unregistering participant:', err);
              }
            });
          }

          // Update availability text locally
          const availabilityP = Array.from(card.querySelectorAll('p')).find(p => p.innerText.includes('Availability'));
          if (availabilityP) {
            const match = availabilityP.innerText.match(/(\d+) spots left/);
            if (match) {
              const current = parseInt(match[1], 10);
              availabilityP.innerText = `Availability: ${Math.max(0, current - 1)} spots left`;
            }
          }
        }

        // Refresh activities to ensure final state matches server
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
