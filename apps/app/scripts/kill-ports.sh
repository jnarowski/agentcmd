#!/bin/bash

# Kill processes on ports 4100, 4101, and 8288

echo "Checking for processes on port 4101..."
lsof -ti:4101 | xargs kill -9 2>/dev/null
if [ $? -eq 0 ]; then
    echo "Killed process on port 4101"
else
    echo "No process found on port 4101"
fi

echo "Checking for processes on port 4100..."
lsof -ti:4100 | xargs kill -9 2>/dev/null
if [ $? -eq 0 ]; then
    echo "Killed process on port 4100"
else
    echo "No process found on port 4100"
fi

echo "Checking for processes on port 8288..."
lsof -ti:8288 | xargs kill -9 2>/dev/null
if [ $? -eq 0 ]; then
    echo "Killed process on port 8288"
else
    echo "No process found on port 8288"
fi

echo "Done!"
