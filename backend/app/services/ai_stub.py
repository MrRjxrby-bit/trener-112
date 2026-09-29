import random

ADDRESSES = [
    "ул. Тверская, д. 1", "Ленинградский пр-т, д. 25",
    "ул. Арбат, д. 10", "Кутузовский пр-т, д. 15",
    "ул. Профсоюзная, д. 56", "Садовая-Кудринская, д. 3",
]
OKRUGS = ["cao", "sao", "vao", "yuao", "zao"]


def generate_scenario(incident_type_code: str) -> dict:
    return {
        "title": f"Автогенерация для типа {incident_type_code}",
        "incident_type_code": incident_type_code,
        "difficulty": random.randint(1, 3),
        "time_limit_sec": 30,
        "payload": {
            "address": random.choice(ADDRESSES),
            "okrug": random.choice(OKRUGS),
            "expected_text": "Сообщение принято, дежурная бригада направлена на место.",
            "expected_signs": {
                "open_fire": random.choice(["Да", "Нет"]),
                "people_threat": random.choice(["Да", "Нет"]),
            },
            "expected_services": random.sample(["101", "102", "103", "104"], k=2),
        },
        "is_published": False,
    }