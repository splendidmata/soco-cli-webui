"""Flask Web UI for SoCo-CLI."""

import logging
import os
import sqlite3
import time
from flask import Flask, jsonify, redirect, render_template, request, url_for

from soco_cli.api import (
    get_all_speaker_names,
    get_soco_object,
    rescan_speakers,
    run_command,
)

app = Flask(__name__)
app.secret_key = "soco-cli-web-ui-secret-key"
logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger(__name__)

DATABASE = os.path.join(os.path.dirname(__file__), "db", "radio_stations.db")
DB_DIR = os.path.dirname(DATABASE)


@app.context_processor
def inject_static_version():
    """Override url_for to append file mtime for static files."""
    original_url_for = url_for

    def versioned_url_for(endpoint, **values):
        url = original_url_for(endpoint, **values)
        if endpoint == 'static':
            filename = values.get('filename', '')
            filepath = os.path.join(app.static_folder, filename)
            if os.path.isfile(filepath):
                mtime = int(os.path.getmtime(filepath))
                url += '?v=' + str(mtime)
        return url

    return dict(url_for=versioned_url_for)


def init_db():
    """Initialize the database with radio_stations table."""
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS radio_stations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            url TEXT NOT NULL UNIQUE
        )
    ''')
    
    # Insert some default radio stations if table is empty
    c.execute("SELECT COUNT(*) FROM radio_stations")
    if c.fetchone()[0] == 0:
        default_stations = [
            ("BBC Radio 1", "http://bbcmedia.ic.llnwd.net/stream/bbcmedia_radio1_mf_p"),
            ("BBC Radio 2", "http://bbcmedia.ic.llnwd.net/stream/bbcmedia_radio2_mf_p"),
            ("Classic FM", "http://media-ice.musicradio.com/ClassicFM"),
            ("Absolute Radio", "http://ais.absoluteradio.co.uk/absolute.mp3"),
            ("Jazz FM", "http://icecast.thisisdax.com/JazzFM"),
            ("Radio Paradise", "http://stream.radioparadise.com/mp3-320"),
        ]
        c.executemany("INSERT INTO radio_stations (title, url) VALUES (?, ?)", default_stations)
    
    conn.commit()
    conn.close()


def get_db():
    """Get a database connection."""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def get_radio_stations():
    """Get all radio stations from database."""
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT id, title, url FROM radio_stations ORDER BY title")
    stations = [dict(row) for row in c.fetchall()]
    conn.close()
    return stations


def add_radio_station(title, url):
    """Add a new radio station to database."""
    conn = get_db()
    c = conn.cursor()
    try:
        c.execute("INSERT INTO radio_stations (title, url) VALUES (?, ?)", (title, url))
        conn.commit()
        station_id = c.lastrowid
        conn.close()
        return station_id, None
    except sqlite3.IntegrityError:
        conn.close()
        return None, "URL already exists"
    except Exception as e:
        conn.close()
        return None, str(e)


def update_radio_station(station_id, title, url):
    """Update an existing radio station."""
    conn = get_db()
    c = conn.cursor()
    try:
        c.execute("UPDATE radio_stations SET title = ?, url = ? WHERE id = ?", (title, url, station_id))
        conn.commit()
        conn.close()
        return True, None
    except sqlite3.IntegrityError:
        conn.close()
        return False, "URL already exists"
    except Exception as e:
        conn.close()
        return False, str(e)


def delete_radio_station(station_id):
    """Delete a radio station from database."""
    conn = get_db()
    c = conn.cursor()
    c.execute("DELETE FROM radio_stations WHERE id = ?", (station_id,))
    conn.commit()
    conn.close()


# Initialize database
init_db()

_speaker_cache = {"timestamp": 0, "data": [], "statuses": {}}

def get_cached_speakers(timeout=5):
    now = time.time()
    if now - _speaker_cache["timestamp"] < timeout and _speaker_cache["data"]:
        return _speaker_cache["data"]
    speakers = get_all_speaker_names()
    _speaker_cache["timestamp"] = now
    _speaker_cache["data"] = speakers
    _speaker_cache["statuses"] = {}
    return speakers

def get_cached_speaker_status(name, timeout=5):
    now = time.time()
    if name in _speaker_cache["statuses"] and now - _speaker_cache["timestamp"] < timeout:
        return _speaker_cache["statuses"][name]
    status = get_speaker_status(name)
    _speaker_cache["statuses"][name] = status
    _speaker_cache["timestamp"] = now
    return status


@app.after_request
def add_cache_headers(response):
    if request.path.startswith('/static/'):
        response.cache_control.max_age = 86400
        response.cache_control.public = True
    return response


def get_speaker_status(speaker_name):
    status = {
        "name": speaker_name,
        "ip": None,
        "volume": None,
        "mute": None,
        "cross_fade": False,
        "state": None,
        "track": None,
        "artist": None,
        "album": None,
        "album_art": None,
        "is_coordinator": True,
        "group": None,
        "sleep_timer": None,
        "sleep_timer_remaining": None,
    }

    speaker, error = get_soco_object(speaker_name)
    if not speaker:
        status["error"] = error
        return status

    status["ip"] = speaker.ip_address
    try:
        status["volume"] = speaker.volume
        status["mute"] = speaker.mute
    except Exception as e:
        logger.warning(f"Could not get volume/mute for {speaker_name}: {e}")

    try:
        status["cross_fade"] = speaker.cross_fade
    except Exception as e:
        logger.warning(f"Could not get cross_fade for {speaker_name}: {e}")

    try:
        st = speaker.get_sleep_timer()
        if st is not None and st > 0:
            status["sleep_timer"] = st
            status["sleep_timer_remaining"] = st
        else:
            status["sleep_timer"] = None
            status["sleep_timer_remaining"] = None
    except Exception as e:
        logger.warning(f"Could not get sleep timer for {speaker_name}: {e}")
        status["sleep_timer"] = None
        status["sleep_timer_remaining"] = None

    try:
        transport = speaker.get_current_transport_info()
        status["state"] = transport.get("current_transport_state", "UNKNOWN")
    except Exception as e:
        logger.warning(f"Could not get transport state for {speaker_name}: {e}")

    try:
        track_info = speaker.get_current_track_info()
        status["track"] = track_info.get("title", "Unknown Track")
        status["artist"] = track_info.get("artist", "Unknown Artist")
        status["album"] = track_info.get("album", "Unknown Album")
        status["album_art"] = track_info.get("album_art_uri", "")
    except Exception as e:
        logger.warning(f"Could not get track info for {speaker_name}: {e}")

    try:
        if speaker.group and speaker.group.coordinator:
            status["is_coordinator"] = speaker is speaker.group.coordinator
            if not status["is_coordinator"]:
                status["group"] = speaker.group.coordinator.player_name
    except Exception as e:
        logger.warning(f"Could not get group info for {speaker_name}: {e}")

    return status


@app.route("/")
def index():
    speakers = get_cached_speakers()
    speaker_statuses = []
    for name in speakers:
        status = get_cached_speaker_status(name)
        speaker_statuses.append(status)

    st_info = _get_sleep_timer_info(speaker_statuses)

    radio_stations = get_radio_stations()

    return render_template("index.html", speakers=speaker_statuses, radio_stations=radio_stations, sleep_timer=st_info)


def _get_sleep_timer_info(speaker_statuses):
    if not speaker_statuses:
        return {"active": False, "seconds": -1, "display": "--"}
    for status in speaker_statuses:
        st = status.get("sleep_timer")
        if st is not None and st > 0:
            m = int(st) // 60
            s = int(st) % 60
            display = f"{m}:{s:02d}"
            return {"active": True, "seconds": int(st), "display": display}
    return {"active": False, "seconds": -1, "display": "--"}


@app.route("/speaker/<speaker_name>")
def speaker_detail(speaker_name):
    status = get_speaker_status(speaker_name)
    return render_template("speaker.html", speaker=status)


@app.route("/api/speakers")
def api_speakers():
    speakers = get_all_speaker_names()
    statuses = []
    for name in speakers:
        status = get_speaker_status(name)
        statuses.append(status)
    return jsonify({"speakers": statuses})


@app.route("/api/speaker/<speaker_name>")
def api_speaker(speaker_name):
    status = get_speaker_status(speaker_name)
    return jsonify(status)


@app.route("/api/speaker/<speaker_name>/action/<action>", methods=["GET", "POST"])
def api_action(speaker_name, action):
    args = []
    if request.method == "POST":
        data = request.get_json() or {}
        args = [str(data.get(arg, "")) for arg in request.args.getlist("arg") if data.get(arg)]

    exit_code, result, error = run_command(speaker_name, action, *args)
    return jsonify({
        "exit_code": exit_code,
        "result": result,
        "error": error
    })


@app.route("/api/speaker/<speaker_name>/play", methods=["POST"])
def api_play(speaker_name):
    exit_code, result, error = run_command(speaker_name, "play")
    return jsonify({"exit_code": exit_code, "result": result, "error": error})


@app.route("/api/speaker/<speaker_name>/pause", methods=["POST"])
def api_pause(speaker_name):
    exit_code, result, error = run_command(speaker_name, "pause")
    return jsonify({"exit_code": exit_code, "result": result, "error": error})


@app.route("/api/speaker/<speaker_name>/stop", methods=["POST"])
def api_stop(speaker_name):
    exit_code, result, error = run_command(speaker_name, "stop")
    return jsonify({"exit_code": exit_code, "result": result, "error": error})


@app.route("/api/speaker/<speaker_name>/next", methods=["POST"])
def api_next(speaker_name):
    exit_code, result, error = run_command(speaker_name, "next")
    return jsonify({"exit_code": exit_code, "result": result, "error": error})


@app.route("/api/speaker/<speaker_name>/previous", methods=["POST"])
def api_previous(speaker_name):
    exit_code, result, error = run_command(speaker_name, "previous")
    return jsonify({"exit_code": exit_code, "result": result, "error": error})


@app.route("/api/speaker/<speaker_name>/volume/<int:volume>", methods=["POST"])
def api_volume(speaker_name, volume):
    exit_code, result, error = run_command(speaker_name, "volume", str(volume))
    return jsonify({"exit_code": exit_code, "result": result, "error": error})


@app.route("/api/speaker/<speaker_name>/volume", methods=["POST"])
def api_volume_set(speaker_name):
    data = request.get_json() or {}
    volume = data.get("volume", 50)
    exit_code, result, error = run_command(speaker_name, "volume", str(volume))
    return jsonify({"exit_code": exit_code, "result": result, "error": error})


@app.route("/api/speaker/<speaker_name>/mute/<state>", methods=["POST"])
def api_mute(speaker_name, state):
    exit_code, result, error = run_command(speaker_name, "mute", state)
    return jsonify({"exit_code": exit_code, "result": result, "error": error})


@app.route("/api/speaker/<speaker_name>/favorites", methods=["GET"])
def api_favorites(speaker_name):
    exit_code, result, error = run_command(speaker_name, "favorites")
    return jsonify({
        "exit_code": exit_code,
        "result": result,
        "error": error
    })


@app.route("/api/speaker/<speaker_name>/play_favorite/<int:index>", methods=["POST"])
def api_play_favorite(speaker_name, index):
    exit_code, result, error = run_command(speaker_name, "play_favorite", str(index))
    return jsonify({"exit_code": exit_code, "result": result, "error": error})


@app.route("/api/speaker/<speaker_name>/playlists", methods=["GET"])
def api_playlists(speaker_name):
    exit_code, result, error = run_command(speaker_name, "playlists")
    return jsonify({
        "exit_code": exit_code,
        "result": result,
        "error": error
    })


@app.route("/api/speaker/<speaker_name>/play_playlist/<int:index>", methods=["POST"])
def api_play_playlist(speaker_name, index):
    exit_code, result, error = run_command(speaker_name, "play_playlist", str(index))
    return jsonify({"exit_code": exit_code, "result": result, "error": error})


@app.route("/api/speaker/<speaker_name>/queue", methods=["GET"])
def api_queue(speaker_name):
    exit_code, result, error = run_command(speaker_name, "queue")
    return jsonify({
        "exit_code": exit_code,
        "result": result,
        "error": error
    })


@app.route("/api/speaker/<speaker_name>/current_track", methods=["GET"])
def api_current_track(speaker_name):
    exit_code, result, error = run_command(speaker_name, "track")
    return jsonify({
        "exit_code": exit_code,
        "result": result,
        "error": error
    })


@app.route("/api/speaker/<speaker_name>/play_url", methods=["POST"])
def api_play_url(speaker_name):
    data = request.get_json() or {}
    url = data.get("url", "")
    title = data.get("title", "")

    if not url:
        return jsonify({"exit_code": 1, "result": "", "error": "URL is required"})

    is_share_link = url.startswith("https://") or url.startswith("http://")

    if is_share_link:
        from soco.plugins.sharelink import ShareLinkPlugin
        speaker, error = get_soco_object(speaker_name)
        if not speaker:
            return jsonify({"exit_code": 1, "result": "", "error": error})
        share_link = ShareLinkPlugin(speaker)
        if share_link.is_share_link(url):
            try:
                position = share_link.add_share_link_to_queue(url, speaker.queue_size + 1)
                speaker.play_from_queue(position - 1)
                return jsonify({"exit_code": 0, "result": "OK", "error": ""})
            except Exception as e:
                return jsonify({"exit_code": 1, "result": "", "error": str(e)})

    if title:
        exit_code, result, error = run_command(speaker_name, "play_uri", url, title)
    else:
        exit_code, result, error = run_command(speaker_name, "play_uri", url)
    return jsonify({"exit_code": exit_code, "result": result, "error": error})


@app.route("/api/speaker/<speaker_name>/sleep_timer", methods=["GET"])
def api_get_sleep_timer(speaker_name):
    status = get_speaker_status(speaker_name)
    if "error" in status:
        return jsonify({"success": False, "error": status["error"]})
    return jsonify({
        "success": True,
        "sleep_timer": status.get("sleep_timer"),
        "sleep_timer_remaining": status.get("sleep_timer_remaining")
    })


@app.route("/api/speaker/<speaker_name>/sleep_timer", methods=["POST"])
def api_set_sleep_timer(speaker_name):
    data = request.get_json() or {}
    action = data.get("action", "")
    duration = data.get("duration", 0)

    speaker, error = get_soco_object(speaker_name)
    if not speaker:
        return jsonify({"success": False, "error": error})

    try:
        if action == "cancel":
            speaker.set_sleep_timer(None)
            return jsonify({"success": True, "sleep_timer": None})
        elif action == "set":
            if not isinstance(duration, (int, float)) or duration <= 0 or duration > 86400:
                return jsonify({"success": False, "error": "Duration must be 1-86400 seconds"})
            speaker.set_sleep_timer(int(duration))
            return jsonify({"success": True, "sleep_timer": int(duration)})
        else:
            return jsonify({"success": False, "error": "Action must be 'set' or 'cancel'"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})


@app.route("/api/speaker/<speaker_name>/toggle_play", methods=["POST"])
def api_toggle_play(speaker_name):
    status = get_speaker_status(speaker_name)
    
    if status["state"] == "PLAYING":
        exit_code, result, error = run_command(speaker_name, "pause")
        return jsonify({"success": exit_code == 0, "playing": False})
    else:
        exit_code, result, error = run_command(speaker_name, "play")
        return jsonify({"success": exit_code == 0, "playing": True})


@app.route("/api/speaker/<speaker_name>/toggle_mute", methods=["POST"])
def api_toggle_mute(speaker_name):
    speaker, error = get_soco_object(speaker_name)
    if not speaker:
        return jsonify({"success": False, "error": error})
    
    try:
        current_mute = speaker.mute
        new_mute = not current_mute
        speaker.mute = new_mute
        return jsonify({"success": True, "muted": new_mute})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})


@app.route("/api/speaker/<speaker_name>/toggle_crossfade", methods=["POST"])
def api_toggle_crossfade(speaker_name):
    speaker, error = get_soco_object(speaker_name)
    if not speaker:
        return jsonify({"success": False, "error": error})
    try:
        current = speaker.cross_fade
        new_val = not current
        speaker.cross_fade = new_val
        return jsonify({"success": True, "cross_fade": new_val})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})


@app.route("/api/rediscover", methods=["POST"])
def api_rediscover():
    rescan_speakers(timeout=2.0)
    speakers = get_all_speaker_names()
    return jsonify({"speakers": speakers})


@app.route("/api/poll", methods=["GET"])
def api_poll():
    speakers = get_cached_speakers()
    statuses = []
    for name in speakers:
        status = get_cached_speaker_status(name)
        statuses.append(status)
    st_info = _get_sleep_timer_info(statuses)
    return jsonify({"speakers": statuses, "sleep_timer": st_info})


# Radio Stations API
@app.route("/api/radio_stations", methods=["GET"])
def api_get_radio_stations():
    stations = get_radio_stations()
    return jsonify({"radio_stations": stations})


@app.route("/api/radio_stations", methods=["POST"])
def api_add_radio_station():
    data = request.get_json() or {}
    title = data.get("title", "").strip()
    url = data.get("url", "").strip()
    
    if not title or not url:
        return jsonify({"success": False, "error": "Title and URL are required"})
    
    station_id, error = add_radio_station(title, url)
    if station_id:
        return jsonify({"success": True, "id": station_id})
    else:
        return jsonify({"success": False, "error": error})


@app.route("/api/radio_stations/<int:station_id>", methods=["PUT"])
def api_update_radio_station(station_id):
    data = request.get_json() or {}
    title = data.get("title", "").strip()
    url = data.get("url", "").strip()
    
    if not title or not url:
        return jsonify({"success": False, "error": "Title and URL are required"})
    
    success, error = update_radio_station(station_id, title, url)
    return jsonify({"success": success, "error": error})


@app.route("/api/radio_stations/<int:station_id>", methods=["DELETE"])
def api_delete_radio_station(station_id):
    delete_radio_station(station_id)
    return jsonify({"success": True})


# Additional API endpoints for bottom player controls
@app.route("/api/toggle_play", methods=["POST"])
def api_toggle_play_global():
    speakers = get_all_speaker_names()
    if not speakers:
        return jsonify({"success": False, "error": "No speakers found"})
    
    speaker_name = speakers[0]
    status = get_speaker_status(speaker_name)
    
    if status["state"] == "PLAYING":
        exit_code, result, error = run_command(speaker_name, "pause")
        return jsonify({"success": exit_code == 0, "playing": False})
    else:
        exit_code, result, error = run_command(speaker_name, "play")
        return jsonify({"success": exit_code == 0, "playing": True})


@app.route("/api/stop", methods=["POST"])
def api_stop_global():
    speakers = get_all_speaker_names()
    if not speakers:
        return jsonify({"success": False, "error": "No speakers found"})
    
    speaker_name = speakers[0]
    exit_code, result, error = run_command(speaker_name, "stop")
    return jsonify({"success": exit_code == 0})


@app.route("/api/next", methods=["POST"])
def api_next_global():
    speakers = get_all_speaker_names()
    if not speakers:
        return jsonify({"success": False, "error": "No speakers found"})
    
    speaker_name = speakers[0]
    exit_code, result, error = run_command(speaker_name, "next")
    return jsonify({"success": exit_code == 0})


@app.route("/api/previous", methods=["POST"])
def api_previous_global():
    speakers = get_all_speaker_names()
    if not speakers:
        return jsonify({"success": False, "error": "No speakers found"})
    
    speaker_name = speakers[0]
    exit_code, result, error = run_command(speaker_name, "previous")
    return jsonify({"success": exit_code == 0})


@app.route("/api/volume", methods=["POST"])
def api_volume_global():
    speakers = get_all_speaker_names()
    if not speakers:
        return jsonify({"success": False, "error": "No speakers found"})
    
    speaker_name = speakers[0]
    data = request.get_json() or {}
    volume = data.get("volume", 50)
    exit_code, result, error = run_command(speaker_name, "volume", str(volume))
    return jsonify({"success": exit_code == 0})


@app.route("/api/toggle_mute", methods=["POST"])
def api_toggle_mute_global():
    speakers = get_all_speaker_names()
    if not speakers:
        return jsonify({"success": False, "error": "No speakers found"})
    
    speaker_name = speakers[0]
    speaker, error = get_soco_object(speaker_name)
    if not speaker:
        return jsonify({"success": False, "error": error})
    
    try:
        current_mute = speaker.mute
        new_mute = not current_mute
        speaker.mute = new_mute
        return jsonify({"success": True, "muted": new_mute})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})


@app.route("/api/play_url", methods=["POST"])
def api_play_url_global():
    speakers = get_all_speaker_names()
    if not speakers:
        return jsonify({"success": False, "error": "No speakers found"})

    speaker_name = speakers[0]
    data = request.get_json() or {}
    url = data.get("url", "")
    title = data.get("title", "")

    if not url:
        return jsonify({"success": False, "error": "URL is required"})

    is_share_link = url.startswith("https://") or url.startswith("http://")

    if is_share_link:
        from soco.plugins.sharelink import ShareLinkPlugin
        speaker, error = get_soco_object(speaker_name)
        if not speaker:
            return jsonify({"success": False, "error": error})
        share_link = ShareLinkPlugin(speaker)
        if share_link.is_share_link(url):
            try:
                position = share_link.add_share_link_to_queue(url, speaker.queue_size + 1)
                speaker.play_from_queue(position - 1)
                return jsonify({"success": True, "error": ""})
            except Exception as e:
                return jsonify({"success": False, "error": str(e)})

    if title:
        exit_code, result, error = run_command(speaker_name, "play_uri", url, title)
    else:
        exit_code, result, error = run_command(speaker_name, "play_uri", url)
    return jsonify({"success": exit_code == 0, "error": error})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)