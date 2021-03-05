import requests
#url = "https://api.lastassassin.app/"
url = "http://localhost:3001/"

# Create Game

host = "Host I Am"
create_request = {
    'Host': host
}

create_response = requests.post(url + "create", create_request).json()

code = create_response['Game']

assert len(create_response['Players']) == 1
assert create_response['Host'] == host

# Host Lobby Heartbeat

host_request = {
    'Game': code,
    'Player': host
}

host_response = requests.post(url + "host", host_request).json()

assert host_response['Mode'] == 'Manual'
assert host_response['Delay'] == 60
assert host_response['AttemptCD'] == 5
assert host_response['TagCD'] == 20
assert host_response['TagDistance'] == 1
assert host_response['LagDistance'] == 3

host_request_rules = {
    'Game': code,
    'Player': host,
    'Mode': 'Honor',
    'Delay': 30,
    'AttemptCD': 0,
    'TagCD': 0,
    'TagDistance': 5,
    'LagDistance': 1
}

print(type(host_request_rules['Delay']))

print(requests.post(url + "host", host_request_rules))

host_response_rules = requests.post(url + "host", host_request_rules).json()

print(host_response_rules)

assert host_response_rules['Mode'] == 'Honor'
assert host_response_rules['Delay'] == 30
assert host_response_rules['AttemptCD'] == 0
assert host_response_rules['TagCD'] == 0
assert host_response_rules['TagDistance'] == 5
assert host_response_rules['LagDistance'] == 1
