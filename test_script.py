import requests
import time
import json
# url = 'https://api.lastassassin.app/'
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
    assert result['Error'] == message, json.dumps(
        request) + '\n' + json.dumps(result)
    global total_errors
    total_errors -= 1


def checkErrors(route, bad_requests, errors):
    for i in range(len(bad_requests)):
        checkError(route, bad_requests[i], errors[i])


host = 'Host'
mode = 'Honor'
delay = 2
cd = 2
t_dist = 5
l_dist = 1
players = [host, 'Steven', 'Stefan', 'Ben', 'Trent', 'Steven']
tokens = []
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
tokens.append(response['Token'])
code = tokens[0][:5]
print('Valid Create Call')

# Early Start Call
print('Early Start Call:')
checkError('start', {
    'Token': tokens[0],
    'HomeLat': homelat,
    'HomeLong': homelong
}, 'Cannot start game with fewer than 3 players.')


## Join Game ##

# Errors
print('Join Errors:')
bad_requests = [
    {}, {
        'Game': code
    }, {
        'Game': 'this game does not exist', 'Player': 'new player'
    }]
errors = [
    'Game code is required.',
    'Player is required.',
    'Game does not exist.']
checkErrors('join', bad_requests, errors)

# Valid Join Calls
for i in range(1, len(players)):
    status, response = fetch('join', {
        'Game': code,
        'Player': players[i]
    })
    assert status == 200
    print(response)
    tokens.append(response['Token'])
    if i < len(players) - 1:
        assert response['Player'] == players[i]
    else:
        assert response['Player'] == players[i] + '2'
        players[i] += '2'
    print('Valid Join Call')


## Host Lobby Heartbeat ##

# Errors
print('Host Errors:')
bad_requests = [
    {}, {
        'Token': 'this game does not exist'
    }, {
        'Token': tokens[1]
    }, {
        'Token': tokens[0],
        'Delay': -1
    }]
errors = [
    'Token is required.',
    'Game does not exist.',
    'You are not the host.',
    'Invalid setting value.']
checkErrors('host', bad_requests, errors)

# Valid Host Call
status, response = fetch('host', {
    'Token': tokens[0]
})
assert status == 200
print(response)
assert response['Players'] == players
assert response['Host'] == host
assert response['Mode'] == 'Manual'
assert response['Delay'] == 60
assert response['Cooldown'] == 5
assert response['TagDistance'] == 1
assert response['LagDistance'] == 3
print('Valid Host Call')

# Valid Host Call (Rules Change)
status, response = fetch('host', {
    'Token': tokens[0],
    'Mode': mode,
    'Delay': delay,
    'Cooldown': cd,
    'TagDistance': t_dist,
    'LagDistance': l_dist
})
assert status == 200
assert response['Mode'] == mode
assert response['Delay'] == delay
assert response['Cooldown'] == cd
assert response['TagDistance'] == t_dist
assert response['LagDistance'] == l_dist
print('Valid Host Call (Rules Change)')


## Lobby Heartbeat ##

# Errors
print('Lobby Errors:')
bad_requests = [
    {}, {
        'Token': 'this game does not exist',
    }, {
        'Token': code + 'not a valid token suffix'
    }]
errors = ['Token is required.',
          'Game does not exist.',
          'Invalid token.']
checkErrors('lobby', bad_requests, errors)

# Valid Lobby Calls
for i in range(1, len(players)):
    status, response = fetch('lobby', {
        'Token': tokens[i]
    })
    assert status == 200
    assert response['Players'] == players
    assert response['Host'] == host
    assert response['Mode'] == mode
    assert response['Delay'] == delay
    assert response['Cooldown'] == cd
    assert response['TagDistance'] == t_dist
    assert response['LagDistance'] == l_dist
    print('Valid Lobby Call')


## Start Game ##

# Errors
print('Start Errors:')
bad_requests = [
    {}, {
        'Token': 'this game does not exist'
    }, {
        'Token': tokens[1]
    }]
errors = [
    'Token is required.',
    'Game does not exist.',
    'You are not the host.']
checkErrors('start', bad_requests, errors)

# Early Game Call
print('Early Game Call:')
checkError('game', {
    'Token': tokens[0],
    'Latitude': 0,
    'Longitude': 0
}, 'Game not yet started.')

# Early Tag Call
print('Early Tag Call:')
checkError('tag', {
    'Token': tokens[0]
}, 'Game not yet started.')

# Valid Start Call
status, response = fetch('start', {
    'Token': tokens[0],
    'HomeLat': homelat,
    'HomeLong': homelong
})
assert status == 200
assert response['Success'] == True
print('Valid Start Call')

# Late Start Call
print('Late Start Call:')
checkError('start', {
    'Token': tokens[0],
    'HomeLat': homelat,
    'HomeLong': homelong
}, 'Game already started.')

# Late Join Call
print('Late Join Call')
checkError('join', {
    'Game': code,
    'Player': 'New Player'
}, 'Cannot join in-progress game.')

## In-Game Heartbeat ##

# Errors
print('Game Errors:')
bad_requests = [
    {}, {
        'Token': tokens[0]
    }, {
        'Token': 'this game does not exist',
        'Latitude': homelat,
        'Longitude': homelong
    }, {
        'Token': code + 'invalid token suffix',
        'Latitude': homelat,
        'Longitude': homelong
    }]
errors = [
    'Token is required.',
    'Coordinates are required.',
    'Game does not exist.',
    'Invalid token.']
checkErrors('game', bad_requests, errors)

# Valid Game Calls (During Countdown)
for i in range(len(players)):
    status, response = fetch('game', {
        'Token': tokens[i],
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
    'Token': tokens[0]
}, 'Start delay not over.')

# Valid Game Calls (After Countdown)
time.sleep(2.5)
targets = {}
for i in range(len(players)):
    status, response = fetch('game', {
        'Token': tokens[i],
        'Latitude': i,
        'Longitude': i
    })
    assert status == 200
    assert response['Living'] == True
    assert response['Tags'] == 0
    targets[players[i]] = response['TargetName']
    assert response['PlayersAlive'] == 6
    assert response['Pending'] == []
    assert response['Attempted'] == False
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
        'Token': 'this game does not exist',
    }, {
        'Token': code + 'invalid token suffix',
    }]
errors = [
    'Token is required.',
    'Game does not exist.',
    'Invalid token.']
checkErrors('tag', bad_requests, errors)

# Verify Errors
print('Verify Errors:')
bad_requests = [
    {}, {
        'Token': tokens[0]
    }, {
        'Token': tokens[0],
        'Hunter': host,
    }, {
        'Token': 'this game does not exist',
        'Hunter': host,
        'Accept': True
    }, {
        'Token': code + 'invalid token suffix',
        'Hunter': host,
        'Accept': True
    }, {
        'Token': tokens[0],
        'Hunter': host,
        'Accept': True
    }]
errors = [
    'Token is required.',
    'Hunter is required.',
    'Response is required.',
    'Game does not exist.',
    'Invalid token.',
    'No matching tag attempt found.']
checkErrors('verify', bad_requests, errors)

# Valid Tag Call
print('Valid Tag Call')
status, response = fetch('tag', {
    'Token': tokens[0]
})
assert status == 200
assert response['Success'] == True
status, response = fetch('game', {
    'Token': tokens[0],
    'Latitude': 0,
    'Longitude': 0
})
assert response['Attempted'] == True
host_target = targets[host]
host_target_index = players.index(host_target)
host_target_token = tokens[host_target_index]
status, response = fetch('game', {
    'Token': host_target_token,
    'Latitude': 0,
    'Longitude': 0
})
assert status == 200
assert response['Pending'] == [host]

# Attempt Still Pending Error
checkError('tag', {
    'Token': tokens[0]
}, 'Previous attempt still pending.')
time.sleep(2.5)

# Valid Verify Call (Reject)
print('Valid Verify Call (Reject)')
status, response = fetch('verify', {
    'Token': host_target_token,
    'Hunter': host,
    'Accept': False
})
assert status == 200
assert response['Success'] == True

# Valid Tag/Verify Calls (Accept)
print('Valid Tag/Verify Calls (Accept)')
status, response = fetch('tag', {
    'Token': tokens[0]
})
assert status == 200
assert response['Success'] == True
status, response = fetch('verify', {
    'Token': host_target_token,
    'Hunter': host,
    'Accept': True
})
targets[host] = targets[host_target]
assert status == 200
assert response['Success'] == True
status, response = fetch('game', {
    'Token': tokens[0],
    'Latitude': 0,
    'Longitude': 0
})
assert status == 200
assert response['Tags'] == 1
assert response['TargetName'] == targets[host_target]
assert response['PlayersAlive'] == 5
assert response['Attempted'] == False
status, response = fetch('game', {
    'Token': host_target_token,
    'Latitude': 0,
    'Longitude': 0
})
assert status == 200
assert response['Living'] == False
assert response['Pending'] == []

# Confirm that a second tag correctly updates targets for everyone
status, response = fetch('tag', {
    'Token': tokens[0]
})
assert status == 200
assert response['Success'] == True
new_host_target = targets[host]
new_host_target_index = players.index(new_host_target)
new_host_target_token = tokens[new_host_target_index]
status, response = fetch('verify', {
    'Token': new_host_target_token,
    'Hunter': host,
    'Accept': True
})
targets[host] = targets[new_host_target]
targets[host_target] = targets[new_host_target]
status, response = fetch('game', {
    'Token': tokens[0],
    'Latitude': 0,
    'Longitude': 0
})
assert status == 200
assert response['Tags'] == 2
assert response['TargetName'] == targets[host]
assert response['PlayersAlive'] == 4
assert response['Attempted'] == False
status, response = fetch('game', {
    'Token': host_target_token,
    'Latitude': 0,
    'Longitude': 0
})
assert status == 200
assert response['Tags'] == 0
assert response['TargetName'] == targets[host]
assert response['PlayersAlive'] == 4
assert response['Attempted'] == False

print('\nAll tests passed.')
