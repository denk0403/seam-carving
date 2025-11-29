CC = gcc
CFLAGS = -O3 -Wall
LDFLAGS = -lm
SDL_FLAGS = $(shell sdl2-config --cflags --libs)
TARGET = build/seamcarve
SRC = seam_carving.c

all: $(TARGET)

$(TARGET): $(SRC)
	mkdir -p build
	$(CC) $(CFLAGS) $(SRC) -o $(TARGET) $(SDL_FLAGS) $(LDFLAGS)

clean:
	rm -rf build

