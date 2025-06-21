import requests
import random

def generate_otp():
    return str(random.randint(100000, 999999))

def send_otp_sms(phone_number, otp):
    url = "https://www.fast2sms.com/dev/bulkV2"

    payload = {
        "route": "otp",
        "variables_values" : otp,
        # "message": f"Your OTP for the sweets app login is {otp}",
        # "language": "english",
        "flash": "0",
        "numbers": phone_number,
    }

    headers = {
        'authorization': "d89wukZSWDnU3jPo01HbmgOFxIEvaKL6JrTYlXt7pGeqAyV5QBQduCeM3WRYiHz4Ayva1FG96IcjbNJO",
        'Content-Type': "application/x-www-form-urlencoded"
    }

    response = requests.post(url, data=payload, headers=headers)
    print(response.text)
    return response.json()
