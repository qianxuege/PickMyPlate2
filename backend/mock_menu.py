"""
Static ParsedMenu (schema v1) for MOCK_MENU_PARSE=1.
IDs are stable UUIDs so client lists / favorites can be tested.
"""

MOCK_PARSED_MENU: dict = {
    "schema_version": 1,
    "restaurant_name": "Noodlehead",
    "sections": [
        {
            "id": "a1b2c3d4-e5f6-4789-a012-3456789abcde",
            "title": "Top Picks",
            "items": [
                {
                    "id": "b2c3d4e5-f6a7-4890-b123-456789abcdef",
                    "name": "Caesar Salad",
                    "description": "Fresh romaine with creamy dressing and parmesan.",
                    "price": {"amount": 9.0, "currency": "USD", "display": "$9"},
                    "spice_level": 0,
                    "tags": ["Vegetarian"],
                    "ingredients": [
                        "Romaine lettuce",
                        "Parmesan",
                        "House Caesar dressing",
                    ],
                    "calories_estimated": 320,
                },
                {
                    "id": "c3d4e5f6-a7b8-4901-c234-56789abcdef0",
                    "name": "Spicy Chicken Tacos",
                    "description": "Bold heat with citrus notes and a satisfying crunch.",
                    "price": {"amount": 12.0, "currency": "USD", "display": "$12"},
                    "spice_level": 3,
                    "tags": ["Spicy"],
                    "ingredients": [
                        "Chicken breast",
                        "Corn tortillas",
                        "Spicy sauce",
                    ],
                    "calories_estimated": 480,
                },
            ],
        },
        {
            "id": "d4e5f6a7-b8c9-4012-d345-6789abcdef01",
            "title": "Other Dishes",
            "items": [
                {
                    "id": "e5f6a7b8-c9d0-4123-e456-789abcdef012",
                    "name": "Thai Curry Bowl",
                    "description": "Coconut curry with jasmine rice.",
                    "price": {"amount": 13.0, "currency": "USD", "display": "$13"},
                    "spice_level": 2,
                    "tags": [],
                    "ingredients": [],
                    "calories_estimated": 620,
                },
            ],
        },
    ],
}
