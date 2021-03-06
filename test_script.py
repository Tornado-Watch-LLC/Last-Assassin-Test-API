import requests
import time
#url = 'https://api.lastassassin.app/'
url = 'http://localhost:3001/'

total_errors = 39


def fetch(route, request):
    response = requests.post(url + route, request)
    status = response.status_code
    if status == 200:
        return status, response.json()
    else:
        return status, None


def checkError(route, request, message):
    status, result = fetch(route, request)
    print('-', result['Error'])
    assert status == 200
    assert result['Error'] == message
    global total_errors
    total_errors -= 1


def checkErrors(route, bad_requests, errors):
    for i in range(len(bad_requests)):
        checkError(route, bad_requests[i], errors[i])


host = 'Host'
mode = 'Honor'
delay = 2
a_cd = 2
t_cd = 4
t_dist = 5
l_dist = 1
players = [host, 'Steven', 'Stefan', 'Ben', 'Trent']
homelat = 0
homelong = 0


## Create Game ##

# Errors
print('Create Errors:')
checkError('create', {}, 'Host is required.')

# Valid Create Call
status, response = fetch('create', {
    'Host': host
})
assert status == 200
code = response['Game']
assert response['Players'] == players[:1]
assert response['Host'] == host
assert response['Mode'] == 'Manual'
assert response['Delay'] == 60
assert response['AttemptCD'] == 5
assert response['TagCD'] == 20
assert response['TagDistance'] == 1
assert response['LagDistance'] == 3
print('Valid Create Call')


## Host Lobby Heartbeat ##

# Errors
print('Host Errors:')
bad_requests = [
    {}, {
        'Game': code
    }, {
        'Game': 'this game does not exist', 'Player': host
    }, {
        'Game': code,
        'Player': 'Not the Host'
    }, {
        'Game': code,
        'Player': host,
        'Delay': -1
    }]
errors = [
    'Game code is required.',
    'Player is required.',
    'Game does not exist.',
    'You are not the host.',
    'Invalid setting value.']
checkErrors('host', bad_requests, errors)

# Valid Host Call
status, response = fetch('host', {
    'Game': code,
    'Player': host
})
assert status == 200
assert response['Players'] == players[:1]
assert response['Host'] == host
assert response['Mode'] == 'Manual'
assert response['Delay'] == 60
assert response['AttemptCD'] == 5
assert response['TagCD'] == 20
assert response['TagDistance'] == 1
assert response['LagDistance'] == 3
print('Valid Host Call')

# Valid Host Call (Rules Change)
status, response = fetch('host', {
    'Game': code,
    'Player': host,
    'Mode': mode,
    'Delay': delay,
    'AttemptCD': a_cd,
    'TagCD': t_cd,
    'TagDistance': t_dist,
    'LagDistance': l_dist
})
assert status == 200
assert response['Mode'] == mode
assert response['Delay'] == delay
assert response['AttemptCD'] == a_cd
assert response['TagCD'] == t_cd
assert response['TagDistance'] == t_dist
assert response['LagDistance'] == l_dist
print('Valid Host Call (Rules Change)')


## Lobby Heartbeat ##

# Errors
print('Lobby Errors:')
bad_requests = [
    {}, {
        'Game': code
    }, {
        'Game': 'this game does not exist',
        'Player': host
    }]
errors = ['Game code is required.',
          'Player is required.',
          'Game does not exist.']
checkErrors('lobby', bad_requests, errors)

# Early Start Call
print('Early Start Call:')
checkError('start', {
    'Game': code,
    'Player': host,
    'HomeLat': homelat,
    'HomeLong': homelong
}, 'Cannot start game with fewer than 3 players.')

# Valid Lobby Calls
for i in range(1, len(players)):
    status, response = fetch('lobby', {
        'Game': code,
        'Player': players[i]
    })
    assert status == 200
    assert response['Players'] == players[:i+1]
    assert response['Host'] == host
    assert response['Mode'] == mode
    assert response['Delay'] == delay
    assert response['AttemptCD'] == a_cd
    assert response['TagCD'] == t_cd
    assert response['TagDistance'] == t_dist
    assert response['LagDistance'] == l_dist
    print('Valid Lobby Call')


## Start Game ##

# Errors
print('Start Errors:')
bad_requests = [
    {}, {
        'Game': code
    }, {
        'Game': code,
        'Player': host
    }, {
        'Game': 'this game does not exist',
        'Player': host,
        'HomeLat': homelat,
        'HomeLong': homelong
    }, {
        'Game': code,
        'Player': 'Not the Host',
        'HomeLat': homelat,
        'HomeLong': homelong
    }]
errors = [
    'Game code is required.',
    'Player is required.',
    'Home coordinates are required.',
    'Game does not exist.',
    'You are not the host.']
checkErrors('start', bad_requests, errors)

# Early Game Call
print('Early Game Call:')
checkError('game', {
    'Game': code,
    'Player': host,
    'Latitude': 0,
    'Longitude': 0
}, 'Game not yet started.')

# Early Tag Call
print('Early Tag Call:')
checkError('tag', {
    'Game': code,
    'Player': host,
}, 'Game not yet started.')

# Valid Start Call
status, response = fetch('start', {
    'Game': code,
    'Player': host,
    'HomeLat': homelat,
    'HomeLong': homelong
})
assert status == 204
assert response == None
print('Valid Start Call')

# Late Start Call
print('Late Start Call:')
checkError('start', {
    'Game': code,
    'Player': host,
    'HomeLat': homelat,
    'HomeLong': homelong
}, 'Game already started.')

# Late Lobby Call (Join Attempt)
print('Late Lobby Call (Join Attempt)')
checkError('lobby', {
    'Game': code,
    'Player': 'New Player'
}, 'Cannot join in-progress game.')

## In-Game Heartbeat ##

# Errors
print('Game Errors:')
bad_requests = [
    {}, {
        'Game': code
    }, {
        'Game': code,
        'Player': host
    }, {
        'Game': 'this game does not exist',
        'Player': host,
        'Latitude': homelat,
        'Longitude': homelong
    }, {
        'Game': code,
        'Player': 'Not a Player',
        'Latitude': homelat,
        'Longitude': homelong
    }]
errors = [
    'Game code is required.',
    'Player is required.',
    'Coordinates are required.',
    'Game does not exist.',
    'Player not in game.']
checkErrors('game', bad_requests, errors)

# Valid Game Calls (During Countdown)
for i in range(len(players)):
    status, response = fetch('game', {
        'Game': code,
        'Player': players[i],
        'Latitude': i,
        'Longitude': i
    })
    assert status == 200
    assert response['Countdown'] < delay
    assert response['Countdown'] > 0
    print('Valid Game Call')

# Early Tag Call
print('Early Tag Call:')
checkError('tag', {
    'Game': code,
    'Player': host
}, 'Start delay not over.')

# Valid Game Calls (After Countdown)
time.sleep(2.5)
targets = {}
for i in range(len(players)):
    status, response = fetch('game', {
        'Game': code,
        'Player': players[i],
        'Latitude': i,
        'Longitude': i
    })
    assert status == 200
    assert response['Living'] == True
    assert response['Tags'] == 0
    targets[players[i]] = response['TargetName']
    assert response['PlayersAlive'] == 5
    assert response['Pending'] == []
    assert response['Status'] == 'None'
    print('Valid Game Call')
for player in players:
    assert targets[player] != player  # Player doesn't target themselves
    # Two players aren't each other's targets
    assert targets[player] != targets[targets[player]]


## Tag/Verify ##

# Tag Errors
print('Tag Errors:')
bad_requests = [
    {}, {
        'Game': code
    }, {
        'Game': 'this game does not exist',
        'Player': host,
        'Latitude': homelat,
        'Longitude': homelong
    }, {
        'Game': code,
        'Player': 'this player is not in the game',
        'Latitude': homelat,
        'Longitude': homelong
    }]
errors = [
    'Game code is required.',
    'Player is required.',
    'Game does not exist.',
    'Player not in game.']
checkErrors('tag', bad_requests, errors)

# Verify Errors
print('Verify Errors:')
bad_requests = [
    {}, {
        'Game': code
    }, {
        'Game': code,
        'Player': targets[host]
    }, {
        'Game': code,
        'Player': targets[host],
        'Hunter': host,
    }, {
        'Game': 'this game does not exist',
        'Player': targets[host],
        'Hunter': host,
        'Accept': True
    }, {
        'Game': code,
        'Player': 'this player is not in the game',
        'Hunter': host,
        'Accept': True
    }, {
        'Game': code,
        'Player': targets[host],
        'Hunter': host,
        'Accept': True
    }]
errors = [
    'Game code is required.',
    'Player is required.',
    'Hunter is required.',
    'Response is required.',
    'Game does not exist.',
    'Player not in game.',
    'No matching tag attempt found.']
checkErrors('verify', bad_requests, errors)

# Valid Tag Call
print('Valid Tag Call')
status, response = fetch('tag', {
    'Game': code,
    'Player': host
})
assert status == 204
assert response == None
status, response = fetch('game', {
    'Game': code,
    'Player': host,
    'Latitude': 0,
    'Longitude': 0
})
assert response['Status'] == 'Pending'

# Attempt Cooldown
checkError('tag', {
    'Game': code,
    'Player': host
}, 'Attempt on cooldown.')
time.sleep(2.5)

# Attempt Still Pending Error
checkError('tag', {
    'Game': code,
    'Player': host
}, 'Previous attempt still pending.')
time.sleep(2.5)

# Valid Verify Call (Reject)
print('Valid Verify Call (Reject)')
status, response = fetch('verify', {
    'Game': code,
    'Player': targets[host],
    'Hunter': host,
    'Accept': False
})
assert status == 204
assert response == None

# Valid Tag/Verify Calls (Accept)
print('Valid Tag/Verify Calls (Accept)')
status, response = fetch('tag', {
    'Game': code,
    'Player': host
})
assert status == 204
assert response == None
status, response = fetch('verify', {
    'Game': code,
    'Player': targets[host],
    'Hunter': host,
    'Accept': True
})
assert status == 204
assert response == None
status, response = fetch('game', {
    'Game': code,
    'Player': host,
    'Latitude': 0,
    'Longitude': 0
})
assert status == 200
assert response['Tags'] == 1
previous_target = targets[host]
targets[host] = targets[previous_target]
assert response['TargetName'] == targets[previous_target]
assert response['PlayersAlive'] == 4
assert response['Status'] == 'Accepted'
status, response = fetch('game', {
    'Game': code,
    'Player': previous_target,
    'Latitude': 0,
    'Longitude': 0
})
assert status == 200
assert response['Living'] == False
assert response['Pending'] == []

# Tag CD
time.sleep(2.5)
checkError('tag', {
    'Game': code,
    'Player': host
}, 'Tag on cooldown.')

print('\nAll tests passed.')
