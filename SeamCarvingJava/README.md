# Seam Carving

## Overview

Seam carving is a content-aware image resizing technique that removes or inserts seams in an image to resize it while preserving the most important content.

## Dependencies
- Java 11

## Features

- Content-aware image resizing
- Seam carving algorithm

## Compilation

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 11) 
javac -d bin -cp "./jars/tester.jar:./jars/javalib.jar" src/SeamCarve.java
```

## Usage

```bash
java -cp "./jars/tester.jar:./jars/javalib.jar:bin" tester.Main ExamplesPixels
```