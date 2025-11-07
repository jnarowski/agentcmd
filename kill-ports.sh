#!/bin/bash

# Kill processes on ports 5173 and 3456

echo "Checking for processes on port 5173..."
lsof -ti:5173 | xargs kill -9 2>/dev/null
if [ $? -eq 0 ]; then
    echo "Killed process on port 5173"
else
    echo "No process found on port 5173"
fi

echo "Checking for processes on port 3456..."
lsof -ti:3456 | xargs kill -9 2>/dev/null
if [ $? -eq 0 ]; then
    echo "Killed process on port 3456"
else
    echo "No process found on port 3456"
fi

echo "Done!"
