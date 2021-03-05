# Setup

import requests
#url = 'https://api.lastassassin.app/'
url = 'http://localhost:3001/'


def checkError(route, request, message):
    result = requests.post(url + route, request).json()['Error']
    print(result)
    assert result == message


## Create Game ##
print('\nCreate')

host = 'Host I Am'
create_request = {
    'Host': host
}

create_response = requests.post(url + 'create', create_request).json()

code = create_response['Game']
assert len(create_response['Players']) == 1
assert create_response['Host'] == host

# Errors

checkError('create', {}, 'Host is required.')


## Host Lobby Heartbeat ##
print('\nHost')

host_request = {
    'Game': code,
    'Player': host
}

host_response = requests.post(url + 'host', host_request).json()

assert host_response['Players'] == [host]
assert host_response['Host'] == host
assert host_response['Mode'] == 'Manual'
assert host_response['Delay'] == 60
assert host_response['AttemptCD'] == 5
assert host_response['TagCD'] == 20
assert host_response['TagDistance'] == 1
assert host_response['LagDistance'] == 3

# Rules Change

mode = 'Honor'
delay = 3
a_cd = 3
t_cd = 6
t_dist = 5
l_dist = 1
host_request_rules = {
    'Game': code,
    'Player': host,
    'Mode': mode,
    'Delay': delay,
    'AttemptCD': a_cd,
    'TagCD': t_cd,
    'TagDistance': t_dist,
    'LagDistance': l_dist
}

host_response_rules = requests.post(url + 'host', host_request_rules).json()

assert host_response_rules['Mode'] == mode
assert host_response_rules['Delay'] == delay
assert host_response_rules['AttemptCD'] == a_cd
assert host_response_rules['TagCD'] == t_cd
assert host_response_rules['TagDistance'] == t_dist
assert host_response_rules['LagDistance'] == l_dist

# Errors

checkError('host', {}, 'Game code is required.')
checkError('host', {'Game': code}, 'Player is required.')
checkError('host', {'Game': 'this game does not exist', 'Player': host},
           'Game does not exist.')
checkError('host', {'Game': code, 'Player': 'Not the Host'},
           'You are not the host.')
checkError('host', {'Game': code, 'Player': host, 'Delay': -1},
           'Invalid setting value.')

## Lobby Heartbeat ##
print('\nLobby')

players = ['Steven', 'Stefan', 'Ben', 'Trent']

for i in range(len(players)):
    lobby_request = {
        'Game': code,
        'Player': players[i]
    }
    lobby_response = requests.post(url + 'lobby', lobby_request).json()
    assert lobby_response['Players'] == [host] + players[:i+1]
    assert lobby_response['Host'] == host
    assert lobby_response['Mode'] == mode
    assert lobby_response['Delay'] == delay
    assert lobby_response['AttemptCD'] == a_cd
    assert lobby_response['TagCD'] == t_cd
    assert lobby_response['TagDistance'] == t_dist
    assert lobby_response['LagDistance'] == l_dist

# Errors

checkError('lobby', {}, 'Game code is required.')
checkError('lobby', {'Game': code}, 'Player is required.')
checkError('lobby', {'Game': 'this game does not exist', 'Player': host},
           'Game does not exist.')

## Start Game ##
print('\nStart')
