import requests
url = 'https://api.lastassassin.app/'
#url = 'http://localhost:3001/'


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


def checkErrors(route, bad_requests, errors):
    for i in range(len(bad_requests)):
        checkError(route, bad_requests[i], errors[i])


host = 'Host'
mode = 'Honor'
delay = 3
a_cd = 3
t_cd = 6
t_dist = 5
l_dist = 1
players = ['Steven', 'Stefan', 'Ben', 'Trent']
homelat = 0
homelong = 0


## Create Game ##
print('\nCreate')

# Errors
checkError('create', {}, 'Host is required.')

# Valid Create Call
status, response = fetch('create', {
    'Host': host
})
assert status == 200
code = response['Game']
assert response['Players'] == [host]
assert response['Host'] == host
assert response['Mode'] == 'Manual'
assert response['Delay'] == 60
assert response['AttemptCD'] == 5
assert response['TagCD'] == 20
assert response['TagDistance'] == 1
assert response['LagDistance'] == 3
print('Valid Create Call')


## Host Lobby Heartbeat ##
print('\nHost')

# Errors
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
assert response['Players'] == [host]
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
print('\nLobby')

# Errors
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

# Valid Lobby Call
for i in range(len(players)):
    status, response = fetch('lobby', {
        'Game': code,
        'Player': players[i]
    })
    assert status == 200
    assert response['Players'] == [host] + players[:i+1]
    assert response['Host'] == host
    assert response['Mode'] == mode
    assert response['Delay'] == delay
    assert response['AttemptCD'] == a_cd
    assert response['TagCD'] == t_cd
    assert response['TagDistance'] == t_dist
    assert response['LagDistance'] == l_dist
    print('Valid Lobby Call')


## Start Game ##
print('\nStart')

# Errors
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


## In-Game Heartbeat ##
print('\nGame')

# Errors
