import copy
from fastapi.testclient import TestClient

from src.app import app, activities

# Snapshot of initial activities to reset state between tests
_initial_activities = copy.deepcopy(activities)


def reset_activities():
    activities.clear()
    activities.update(copy.deepcopy(_initial_activities))


client = TestClient(app)


def test_get_activities():
    reset_activities()
    r = client.get("/activities")
    assert r.status_code == 200
    data = r.json()
    assert "Chess Club" in data
    assert isinstance(data["Chess Club"]["participants"], list)


def test_signup_adds_participant():
    reset_activities()
    email = "newuser@example.com"
    r = client.post(f"/activities/Chess%20Club/signup?email={email}")
    assert r.status_code == 200

    r2 = client.get("/activities")
    assert email in r2.json()["Chess Club"]["participants"]


def test_signup_duplicate_returns_400():
    reset_activities()
    email = "michael@mergington.edu"  # already signed up in fixture
    r = client.post(f"/activities/Chess%20Club/signup?email={email}")
    assert r.status_code == 400


def test_delete_participant():
    reset_activities()
    email = "michael@mergington.edu"
    r = client.delete(f"/activities/Chess%20Club/participants/{email}")
    assert r.status_code == 200

    r2 = client.get("/activities")
    assert email not in r2.json()["Chess Club"]["participants"]


def test_delete_nonexistent_returns_404():
    reset_activities()
    email = "notfound@example.com"
    r = client.delete(f"/activities/Chess%20Club/participants/{email}")
    assert r.status_code == 404
