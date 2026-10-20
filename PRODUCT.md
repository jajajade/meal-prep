# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Jade (a designer) and her partner Matteo. They use it mostly on their phones in the kitchen while prepping and cooking, often with busy or messy hands.

## Product Purpose
A weekly meal-prep plan and recipe reference: the week's overview, cook-day schedule, component recipes, mix-and-match meals, nutrition estimates, shopping and freezer notes, plus an archive of past weeks so they can repeat them.

## Operating Context
Opened from file:// or GitHub Pages. Static HTML/CSS with a tiny JS archive list (weeks.js) and a Python build step (build.py) that generates index.html from the newest week page.

## Capabilities and Constraints
No heavy dependencies; optional Google Fonts only. Must work offline from file://. Australian spelling, metric units. Nutrition figures are estimates and must stay labelled as such.

## Brand Commitments
Tone: warm, clean, practical, highly readable.

## Product Principles
- Readable at arm's length on a phone in the kitchen.
- Fast to scan: find tonight's meal and the next prep step in seconds.
- Honest numbers: estimates are always labelled.
