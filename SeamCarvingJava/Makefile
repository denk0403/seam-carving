# Variables
# Try to find Java 11 on macOS/Linux (if java_home exists)
JAVA_HOME_11 := $(shell /usr/libexec/java_home -v 11 2>/dev/null)

ifdef JAVA_HOME_11
    JAVAC = $(JAVA_HOME_11)/bin/javac
    JAVA = $(JAVA_HOME_11)/bin/java
else
    JAVAC = javac
    JAVA = java
endif

JAVA_VERSION = 11
SRC_DIR = src
BIN_DIR = bin
LIB_DIR = jars
# Classpath includes the jars in lib directory and the bin directory
CLASSPATH = $(LIB_DIR)/tester.jar:$(LIB_DIR)/javalib.jar:$(BIN_DIR)

# Source files
SOURCES = $(wildcard $(SRC_DIR)/*.java)

# Default target
all: compile

# Compile the source files
compile:
	@mkdir -p $(BIN_DIR)
	$(JAVAC) --release $(JAVA_VERSION) -d $(BIN_DIR) -cp "$(CLASSPATH)" $(SOURCES)

# Run the program (Tests)
run: compile
	$(JAVA) -cp "$(CLASSPATH)" tester.Main ExamplesPixels

# Clean up compiled files
clean:
	rm -rf $(BIN_DIR)

.PHONY: all compile run clean

