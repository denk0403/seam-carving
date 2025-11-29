import java.util.ArrayList;
import java.util.Stack;

import tester.*;
import javalib.impworld.*;
import javalib.worldimages.*;
import java.awt.Color;

// represents an IPixel
interface IPixel {

  // sets this pixel's right neighbor to the given pixel
  void setRight(IPixel pixel);

  // sets this pixel's left neighbor to the given pixel
  void setLeft(IPixel pixel);

  // sets this pixel's up neighbor to the given pixel
  void setUp(IPixel pixel);

  // sets this pixel's down neighbor to the given pixel
  void setDown(IPixel pixel);

  // gets the right neighbor
  IPixel getRight();

  // gets the up neighbor
  IPixel getUp();

  // gets the left neighbor
  IPixel getLeft();

  // gets the down neighbor
  IPixel getDown();

  // gets the color
  Color getColor();

  // gets the color
  Color getColor(int mode);

  // returns the brightness value of this pixel
  double brightness();

  // returns this pixel's horizontal energy
  double horizEnergy();

  // returns this pixel's vertical energy
  double vertEnergy();

  // returns the total energy of this pixel
  double energy();

  // is this pixel the same as the given IPixel?
  boolean sameIPixelAs(IPixel pixel);

  // is this pixel the same as the given BorderPixel?
  boolean sameBorderPixelAs(BorderPixel pixel);

  // is this pixel the same as the given Pixel?
  boolean samePixelAs(Pixel pixel);

  // separates the pixel and connects it to border pixels
  void separate();

  // invalidates the energy cache of this pixel
  void invalidateEnergy();

}

// represents an abstract pixel
abstract class APixel implements IPixel {

  // invalidates the energy cache of this pixel
  public void invalidateEnergy() {
    // Do nothing by default (for BorderPixel)
  }

  // returns the total energy of this pixel
  public double energy() {
    return Math
        .sqrt(this.horizEnergy() * this.horizEnergy() + this.vertEnergy() * this.vertEnergy());
  }

  // checks whether two APixels are equal
  public boolean equals(Object obj) {
    return (obj instanceof IPixel) && this.sameIPixelAs((IPixel) obj);
  }

  // returns the hashcode for APixel
  public int hashCode() {
    return this.getColor().hashCode() + this.getLeft().getColor().hashCode()
        + this.getRight().getColor().hashCode() + this.getUp().getColor().hashCode()
        + this.getDown().getColor().hashCode();

  }

}

// represents a border pixel (behaves like a leaf of a tree)
class BorderPixel extends APixel {

  // sets this pixel's right neighbor to the given pixel
  public void setRight(IPixel pixel) {
    // A BorderPixel doesn't actually have neighbors
  }

  // sets this pixel's left neighbor to the given pixel
  public void setLeft(IPixel pixel) {
    // A BorderPixel doesn't actually have neighbors
  }

  // sets this pixel's up neighbor to the given pixel
  public void setUp(IPixel pixel) {
    // A BorderPixel doesn't actually have neighbors
  }

  // sets this pixel's down neighbor to the given pixel
  public void setDown(IPixel pixel) {
    // A BorderPixel doesn't actually have neighbors
  }

  // gets the right neighbor (itself)
  public IPixel getRight() {
    return this;
  }

  // gets the left neighbor (itself)
  public IPixel getLeft() {
    return this;
  }

  // gets the up neighbor (itself)
  public IPixel getUp() {
    return this;
  }

  // gets the down neighbor (itself)
  public IPixel getDown() {
    return this;
  }

  // gets the color
  public Color getColor() {
    return Color.BLACK;
  }

  // gets the color based on the given mode
  public Color getColor(int mode) {
    return this.getColor();
  }

  // returns the brightness value of this pixel
  public double brightness() {
    return 0;
  }

  // returns this pixel's horizontal energy
  public double horizEnergy() {
    return 0;
  }

  // returns this pixel's vertical energy
  public double vertEnergy() {
    return 0;
  }

  // is this pixel the same as the given IPixel?
  public boolean sameIPixelAs(IPixel pixel) {
    return pixel.sameBorderPixelAs(this);
  }

  // is this pixel the same as the given BorderPixel?
  public boolean sameBorderPixelAs(BorderPixel pixel) {
    return true;
  }

  // is this pixel the same as the given Pixel?
  public boolean samePixelAs(Pixel pixel) {
    return false;
  }

  // separates the pixels and connects it to border pixels
  public void separate() {
    // A BorderPixel doesn't actually have neighbors
  }

}

// represents a pixel
class Pixel extends APixel {
  
  Utils utils = new Utils();

  IPixel up;
  IPixel down;
  IPixel left;
  IPixel right;
  Color color;
  boolean beingRemoved;
  Double energyCache;
  Double brightnessCache;

  // creates a pixel at the given x,y with the given color
  Pixel(Color origColor) {
    this.color = origColor;
    this.beingRemoved = false;
    this.up = new BorderPixel();
    this.down = new BorderPixel();
    this.left = new BorderPixel();
    this.right = new BorderPixel();
  }

  // for testing
  Pixel(Pixel base, IPixel up, IPixel down, IPixel left, IPixel right) {
    this.color = base.color;
    this.beingRemoved = base.beingRemoved;
    this.up = up;
    this.down = down;
    this.left = left;
    this.right = right;
  }

  // creates a dummy pixel
  Pixel() {
    this(Color.WHITE);
  }

  // invalidates the energy cache of this pixel
  public void invalidateEnergy() {
    this.energyCache = null;
  }

  // sets this pixel's right neighbor to the given pixel
  public void setRight(IPixel pixel) {
    this.right = pixel;
    this.invalidateEnergy();
    this.up.invalidateEnergy();
    this.down.invalidateEnergy();
  }

  // sets this pixel's left neighbor to the given pixel
  public void setLeft(IPixel pixel) {
    this.left = pixel;
    this.invalidateEnergy();
    this.up.invalidateEnergy();
    this.down.invalidateEnergy();
  }

  // sets this pixel's up neighbor to the given pixel
  public void setUp(IPixel pixel) {
    this.up = pixel;
    this.invalidateEnergy();
    this.left.invalidateEnergy();
    this.right.invalidateEnergy();
  }

  // sets this pixel's down neighbor to the given pixel
  public void setDown(IPixel pixel) {
    this.down = pixel;
    this.invalidateEnergy();
    this.left.invalidateEnergy();
    this.right.invalidateEnergy();
  }

  // gets the right neighbor
  public IPixel getRight() {
    return this.right;
  }

  // gets the left neighbor
  public IPixel getLeft() {
    return this.left;
  }

  // gets the up neighbor
  public IPixel getUp() {
    return this.up;
  }

  // gets the down neighbor
  public IPixel getDown() {
    return this.down;
  }

  // gets the color
  public Color getColor() {
    if (this.beingRemoved) {
      return Color.RED;
    }
    return this.color;
  }

  // gets the color based on the given mode
  public Color getColor(int mode) {
    if (mode == 1 || this.beingRemoved) {
      return this.getColor();
    }
    else {
      int normalizedValue = (int) (this.energy() / Math.sqrt(32) * 255);
      return new Color(normalizedValue, normalizedValue, normalizedValue);
    }
  }

  // returns the brightness value of this pixel
  public double brightness() {
    if (this.brightnessCache == null) {
      this.brightnessCache = ((this.color.getRed() + this.color.getBlue() + this.color.getGreen())
          / 3.0) / 255.0;
    }
    return this.brightnessCache;
  }

  // returns this pixel's horizontal energy
  public double horizEnergy() {
    return this.left.getUp().brightness() + 2 * this.left.brightness()
        + this.left.getDown().brightness() - (this.right.getUp().brightness()
            + 2 * this.right.brightness() + this.right.getDown().brightness());
  }

  // returns this pixel's vertical energy
  public double vertEnergy() {
    return this.up.getLeft().brightness() + 2 * this.up.brightness()
        + this.up.getRight().brightness() - (this.down.getLeft().brightness()
            + 2 * this.down.brightness() + this.down.getRight().brightness());
  }

  // returns the total energy of this pixel
  public double energy() {
    if (this.energyCache == null) {
      this.energyCache = super.energy();
    }
    return this.energyCache;
  }

  // is this pixel the same as the given IPixel?
  public boolean sameIPixelAs(IPixel pixel) {
    return pixel.samePixelAs(this);
  }

  // is this pixel the same as the given BorderPixel?
  public boolean sameBorderPixelAs(BorderPixel pixel) {
    return false;
  }

  // is this pixel the same as the given Pixel?
  public boolean samePixelAs(Pixel pixel) {
    return this.color == pixel.color && this.beingRemoved == pixel.beingRemoved
        && this.left == pixel.left && this.right == pixel.right && this.down == pixel.down
        && this.up == pixel.up;
  }

  // fixes pixel stitching of just the left and right pixels
  public void slideStill() {
    Utils.getInstance().connectLeftToRight(this.getLeft(), this.getRight());
  }

  // fixes stitching to the right of this pixel
  public void slideLeft() {
    Utils.getInstance().connectLeftToRight(this.getLeft(), this.getRight());
    Utils.getInstance().connectDownToUp(this.getRight(), this.getUp());
  }

  // fixes stitching to the left of this pixel
  public void slideRight() {
    Utils.getInstance().connectLeftToRight(this.getLeft(), this.getRight());
    Utils.getInstance().connectDownToUp(this.getLeft(), this.getUp());
  }

  // fixes pixel stitching of just down and up pixels
  public void slideStillHoriz() {
    Utils.getInstance().connectDownToUp(this.getDown(), this.getUp());
  }

  // fixes stitching down of this pixel
  public void slideUp() {
    Utils.getInstance().connectDownToUp(this.getDown(), this.getUp());
    Utils.getInstance().connectLeftToRight(this.getLeft(), this.getDown());
  }

  // fixes stitching up of this pixel
  public void slideDown() {
    Utils.getInstance().connectDownToUp(this.getDown(), this.getUp());
    Utils.getInstance().connectLeftToRight(this.getLeft(), this.getUp());
  }

  // separates the pixels and connects it to border pixels
  public void separate() {
    this.up = new BorderPixel();
    this.down = new BorderPixel();
    this.left = new BorderPixel();
    this.right = new BorderPixel();
  }

  // revalidates this pixel and its immediate neighbors to it
  public void revalidate() {
    Utils utils = Utils.getInstance();
    utils.connectDownToUp(this, this.up);
    utils.connectDownToUp(this.down, this);
    utils.connectLeftToRight(this, this.right);
    utils.connectLeftToRight(this.left, this);
  }

}

// represents a class of utilities
class Utils {
  
  private static Utils instance = new Utils();

  public static Utils getInstance() {
    return instance;
  }

  // connects the left given pixel to the right given pixel
  void connectLeftToRight(IPixel onLeft, IPixel onRight) {
    onLeft.setRight(onRight);
    onRight.setLeft(onLeft);
  }

  // connects the bottom given pixel to the right given pixel
  void connectDownToUp(IPixel onBottom, IPixel onTop) {
    onBottom.setUp(onTop);
    onTop.setDown(onBottom);
  }

  // constructs a valid graph of pixels
  ArrayList<ArrayList<Pixel>> constructPixelGraph(FromFileImage image) {
    ArrayList<ArrayList<Pixel>> result = new ArrayList<>();
    Pixel pixel = new Pixel();
    IPixel frontOfRow = new BorderPixel();
    for (int y = 0; y < (int) image.getHeight(); y += 1) {
      ArrayList<Pixel> row = new ArrayList<>();
      Pixel newFront = new Pixel(image.getColorAt(0, y));
      this.connectDownToUp(newFront, frontOfRow);
      frontOfRow = newFront;
      pixel = newFront;
      row.add(pixel);
      for (int x = 1; x < (int) image.getWidth(); x += 1) {
        Pixel nextPixel = new Pixel(image.getColorAt(x, y));
        this.connectLeftToRight(pixel, nextPixel);
        this.connectDownToUp(nextPixel, pixel.getUp().getRight());
        pixel = nextPixel;
        row.add(pixel);
      }
      result.add(row);
    }
    return result;
  }

  // is every pixel in the given list of pixels part of a well formed graph of
  // pixels?
  boolean verifyPixelGraph(ArrayList<ArrayList<Pixel>> pixels) {
    boolean everythingIsOKForNow = true;
    // for (ArrayList<Pixel> pixelRow : pixels) {
    //   for (IPixel pixel : pixelRow) {
    //     everythingIsOKForNow = pixel.getUp().getRight().sameIPixelAs(pixel.getRight().getUp())
    //         && pixel.getUp().getLeft().sameIPixelAs(pixel.getLeft().getUp())
    //         && pixel.getDown().getLeft().sameIPixelAs(pixel.getLeft().getDown())
    //         && pixel.getDown().getRight().sameIPixelAs(pixel.getRight().getDown());
    //     if (!everythingIsOKForNow) {
    //       return everythingIsOKForNow;
    //     }
    //   }
    // }
    return everythingIsOKForNow;
  }

  // returns an arraylist of seams at the bottom row of pixels
  ArrayList<ASeamInfo> seamify(ArrayList<ArrayList<Pixel>> pixels, boolean isVert) {
    if (pixels.isEmpty() || pixels.get(0).isEmpty()) {
      return new ArrayList<ASeamInfo>();
    }

    int h = pixels.size();
    int w = pixels.get(0).size();

    double[] rowEnergies = new double[w];
    int[][] parentIndices = new int[h][w];

    // Initialize first row
    for (int x = 0; x < w; x++) {
      rowEnergies[x] = pixels.get(0).get(x).energy();
      parentIndices[0][x] = -1;
    }

    double[] nextRowEnergies = new double[w];

    // DP
    for (int y = 1; y < h; y++) {
      ArrayList<Pixel> currentRow = pixels.get(y);
      for (int x = 0; x < w; x++) {
        Pixel p = currentRow.get(x);
        double energy = p.energy();

        double minC = rowEnergies[x];
        int minIdx = x;

        // Check top-left
        if (x > 0 && rowEnergies[x - 1] < minC) {
          minC = rowEnergies[x - 1];
          minIdx = x - 1;
        }
        // Check top-right
        if (x < w - 1 && rowEnergies[x + 1] < minC) {
          minC = rowEnergies[x + 1];
          minIdx = x + 1;
        }

        nextRowEnergies[x] = minC + energy;
        parentIndices[y][x] = minIdx;
      }
      System.arraycopy(nextRowEnergies, 0, rowEnergies, 0, w);
    }

    // Find best seam end
    double minTotal = Double.MAX_VALUE;
    int minIdx = -1;
    for (int x = 0; x < w; x++) {
      if (rowEnergies[x] < minTotal) {
        minTotal = rowEnergies[x];
        minIdx = x;
      }
    }

    // Reconstruct path
    int[] path = new int[h];
    int currX = minIdx;
    for (int y = h - 1; y >= 0; y--) {
      path[y] = currX;
      currX = parentIndices[y][currX];
    }

    // Build SeamInfo linked list (top to bottom)
    ASeamInfo lastSeam = null;
    double currentTotalWeight = 0;

    for (int y = 0; y < h; y++) {
      Pixel p = pixels.get(y).get(path[y]);
      currentTotalWeight += p.energy();

      if (isVert) {
        lastSeam = new VertSeamInfo(p, currentTotalWeight, (VertSeamInfo) lastSeam, path[y]);
      }
      else {
        lastSeam = new HorizSeamInfo(p, currentTotalWeight, (HorizSeamInfo) lastSeam, path[y]);
      }
    }

    ArrayList<ASeamInfo> result = new ArrayList<>();
    result.add(lastSeam);
    return result;
  }

  // returns the most boring seam coming from the 3 neighbor seams above
  ASeamInfo seamifyMemo(Pixel pixel, ArrayList<ASeamInfo> memo, int index, boolean isVert) {
    ASeamInfo topLeft = this.getSeamOrNull(memo, index - 1);
    double topLeftValue = (topLeft == null) ? 0.0 : topLeft.totalWeight;
    ASeamInfo top = this.getSeamOrNull(memo, index);
    double topValue = (top == null) ? 0.0 : top.totalWeight;
    ASeamInfo topRight = this.getSeamOrNull(memo, index + 1);
    double topRightValue = (topRight == null) ? 0.0 : topRight.totalWeight;

    ASeamInfo minSeam = top;
    double minSeamValue = topValue;
    if (topLeft != null && topLeftValue < minSeamValue) {
      minSeamValue = topLeftValue;
      minSeam = topLeft;
    }
    if (topRight != null && topRightValue < minSeamValue) {
      minSeamValue = topRightValue;
      minSeam = topRight;
    }
    if (minSeam == null) {
      return isVert ? new VertSeamInfo(pixel, minSeamValue + pixel.energy(), null, index)
          : new HorizSeamInfo(pixel, minSeamValue + pixel.energy(), null, index);
    }
    else {
      return minSeam.makeNextSeam(pixel, minSeamValue + pixel.energy(), index);
    }

  }

  // returns the "most boring" seam (smallest totalweight)
  public ASeamInfo getSmallestSeam(ArrayList<ASeamInfo> seams) {
    if (seams.size() == 0) {
      return null;
    }
    int indexOfSmallest = 0;
    for (int index = 0; index < seams.size(); index += 1) {
      if (seams.get(index).totalWeight < seams.get(indexOfSmallest).totalWeight) {
        indexOfSmallest = index;
      }
    }
    return seams.get(indexOfSmallest);
  }

  // returns the corresponding SeamInfo (or null) at the given index from the
  // given memo
  public ASeamInfo getSeamOrNull(ArrayList<ASeamInfo> memo, int index) {
    if (index >= 0 && index < memo.size()) {
      return memo.get(index);
    }
    else {
      return null;
    }
  }

  // transposes a given ArrayList of ArrayList of items
  // Note: Output will always have at least one row, but columns may be empty
  <T> ArrayList<ArrayList<T>> transpose(ArrayList<ArrayList<T>> src) {
    ArrayList<ArrayList<T>> result = new ArrayList<>();
    int cols = src.get(0).size();
    int rows = (src.get(0).isEmpty()) ? 0 : src.size();
    for (ArrayList<T> arr : src) {
      if (arr.size() != cols) {
        throw new IllegalArgumentException("Matrix is invalid");
      }
    }
    for (int col = 0; col < cols; col += 1) {
      result.add(new ArrayList<>());
      for (int row = 0; row < rows; row += 1) {
        result.get(col).add(src.get(row).get(col));
      }
    }
    if (result.isEmpty()) {
      result.add(new ArrayList<>());
    }
    return result;
  }

}

// represents a Seam of pixels
abstract class ASeamInfo {

  Pixel pixel;
  double totalWeight;
  ASeamInfo cameFrom;
  int index;

  // creates a seam
  ASeamInfo(Pixel pixel, double totalWeight, ASeamInfo cameFrom, int index) {
    this.pixel = pixel;
    this.totalWeight = totalWeight;
    this.cameFrom = cameFrom;
    this.index = index;
  }

  // creates a seam (legacy/test constructor)
  ASeamInfo(Pixel pixel, double totalWeight, ASeamInfo cameFrom) {
    this(pixel, totalWeight, cameFrom, -1);
  }

  // paints the pixels in the seam red
  public void paintRed() {
    this.pixel.beingRemoved = true;
    if (this.cameFrom != null) {
      this.cameFrom.paintRed();
    }
  }

  // reverts the pixels in the seam to their original color
  public void unPaintRed() {
    this.pixel.beingRemoved = false;
    if (this.cameFrom != null) {
      this.cameFrom.unPaintRed();
    }
  }

  // returns the next seam connected to this from the given pixel and weight
  public abstract ASeamInfo makeNextSeam(Pixel pixel, double weight, int index);

  // legacy/test
  public ASeamInfo makeNextSeam(Pixel pixel, double weight) {
    return this.makeNextSeam(pixel, weight, -1);
  }

  // removes this seam from the given list of pixels and row
  public abstract void removeSelf(ArrayList<ArrayList<Pixel>> pixels, int pos);

  // inserts this seam into the given list of pixels
  public abstract ArrayList<ArrayList<Pixel>> insert(ArrayList<ArrayList<Pixel>> pixels);

  // helps insert this seam into the given list of pixels
  public abstract ArrayList<ArrayList<Pixel>> insertHelper(ArrayList<ArrayList<Pixel>> pixels,
      int count);

}

// represents a vertical seam
class VertSeamInfo extends ASeamInfo {

  // creates a vertical seam
  VertSeamInfo(Pixel pixel, double totalWeight, VertSeamInfo cameFrom, int index) {
    super(pixel, totalWeight, cameFrom, index);
  }

  VertSeamInfo(Pixel pixel, double totalWeight, VertSeamInfo cameFrom) {
    this(pixel, totalWeight, cameFrom, -1);
  }

  // removes this seam from the given list of pixels and row
  public void removeSelf(ArrayList<ArrayList<Pixel>> pixels, int row) {
    if (this.cameFrom != null) {
      if (this.cameFrom.pixel.sameIPixelAs(this.pixel.getUp())) {
        this.pixel.slideStill();
      }
      else if (this.cameFrom.pixel.sameIPixelAs(this.pixel.getUp().getRight())) {
        this.pixel.slideLeft();
      }
      else if (this.cameFrom.pixel.sameIPixelAs(this.pixel.getUp().getLeft())) {
        this.pixel.slideRight();
      }
      else {
        throw new IllegalStateException("Pixel Image is Ill-Formed");
      }
      this.cameFrom.removeSelf(pixels, row - 1);
    }
    else {
      this.pixel.slideStill();
    }
    if (this.index != -1) {
      pixels.get(row).remove(this.index);
    } else {
      pixels.get(row).remove(this.pixel);
    }

  }

  // returns the next seam connected to this from the given pixel and weight
  public ASeamInfo makeNextSeam(Pixel pixel, double weight, int index) {
    return new VertSeamInfo(pixel, weight, this, index);
  }

  // inserts this seam into the given list of pixels
  public ArrayList<ArrayList<Pixel>> insert(ArrayList<ArrayList<Pixel>> pixels) {
    return this.insertHelper(pixels, 0);

  }

  // helps insert this seam into the given list of pixels
  public ArrayList<ArrayList<Pixel>> insertHelper(ArrayList<ArrayList<Pixel>> pixels, int count) {
    if (pixels.size() - 1 < count) {
      pixels.add(new ArrayList<>());
    }
    if (this.cameFrom != null) {
      this.cameFrom.insertHelper(pixels, count + 1);
    }
    this.pixel.revalidate();
    int row = pixels.size() - count - 1;
    int index = pixels.get(row).indexOf(this.pixel.getRight());
    if (index == -1) {
      pixels.get(row).add(this.pixel);
    }
    else {
      pixels.get(row).add(index, this.pixel);
    }
    return pixels;
  }

}

// represents a horizontal seam
class HorizSeamInfo extends ASeamInfo {

  Utils utils = new Utils();

  // creates a horizontal seam
  HorizSeamInfo(Pixel pixel, double totalWeight, HorizSeamInfo cameFrom, int index) {
    super(pixel, totalWeight, cameFrom, index);
  }

  HorizSeamInfo(Pixel pixel, double totalWeight, HorizSeamInfo cameFrom) {
    this(pixel, totalWeight, cameFrom, -1);
  }

  // removes this seam from the given list of pixels and row
  public void removeSelf(ArrayList<ArrayList<Pixel>> pixels, int col) {
    if (this.cameFrom != null) {
      if (this.cameFrom.pixel.sameIPixelAs(this.pixel.getLeft())) {
        this.pixel.slideStillHoriz();
      }
      else if (this.cameFrom.pixel.sameIPixelAs(this.pixel.getLeft().getDown())) {
        this.pixel.slideUp();
      }
      else if (this.cameFrom.pixel.sameIPixelAs(this.pixel.getLeft().getUp())) {
        this.pixel.slideDown();
      }
      else {
        throw new IllegalStateException("Pixel Image is Ill-Formed");
      }
      this.cameFrom.removeSelf(pixels, col - 1);
    }
    else {
      this.pixel.slideStillHoriz();
    }
    if (this.index != -1) {
      pixels.get(col).remove(this.index);
    } else {
      pixels.get(col).remove(this.pixel);
    }
  }

  // returns the next seam connected to this from the given pixel and weight
  public ASeamInfo makeNextSeam(Pixel pixel, double weight, int index) {
    return new HorizSeamInfo(pixel, weight, this, index);
  }

  // inserts this seam into the given list of pixels
  public ArrayList<ArrayList<Pixel>> insert(ArrayList<ArrayList<Pixel>> pixels) {
    Utils utils = Utils.getInstance();
    pixels = utils.transpose(pixels);
    pixels = this.insertHelper(pixels, 0);
    pixels = utils.transpose(pixels);
    return pixels;
  }

  // helps insert this seam into the given list of pixels
  public ArrayList<ArrayList<Pixel>> insertHelper(ArrayList<ArrayList<Pixel>> pixels, int count) {
    if (pixels.size() - 1 < count) {
      pixels.add(new ArrayList<>());
    }
    if (this.cameFrom != null) {
      this.cameFrom.insertHelper(pixels, count + 1);
    }
    this.pixel.revalidate();
    int row = pixels.size() - count - 1;
    int index = pixels.get(row).indexOf(this.pixel.getDown());
    if (index == -1) {
      pixels.get(row).add(this.pixel);
    }
    else {
      pixels.get(row).add(index, this.pixel);
    }
    return pixels;
  }

}

// represents a seam carving animation
class SeamCarving extends World {

  ArrayList<ArrayList<Pixel>> pixels;
  Stack<ASeamInfo> history;
  ASeamInfo badSeam;
  int width;
  int height;
  boolean removeVert;
  boolean isPlaying;
  boolean isReversed;
  int colorMode;

  // creates a seam carving animation from a given image
  SeamCarving(FromFileImage image) {
    this.width = (int) image.getWidth();
    this.height = (int) image.getHeight();
    this.pixels = Utils.getInstance().constructPixelGraph(image);
    this.history = new Stack<>();
    this.badSeam = null;
    this.removeVert = true;
    this.isPlaying = true;
    this.colorMode = 1;
    this.isReversed = false;
  }

  // creates a seam carving animation for a given arraylist of pixels
  SeamCarving(ArrayList<ArrayList<Pixel>> pixels) {
    this.width = pixels.get(0).size();
    this.height = pixels.size();
    this.pixels = pixels;
    this.history = new Stack<>();
    this.badSeam = null;
    this.removeVert = true;
    this.isPlaying = true;
    this.colorMode = 1;
    this.isReversed = false;
  }

  // constructs the scene using an arrayList of pixels
  public WorldScene makeScene() {
    WorldScene scene = new WorldScene(this.width, this.height);
    ComputedPixelImage pixelImage = new ComputedPixelImage(this.width, this.height);
    for (int y = 0; y < this.pixels.size() && y < this.height; y += 1) {
      for (int x = 0; x < this.pixels.get(y).size() && x < this.width; x += 1) {
        Pixel pixel = this.pixels.get(y).get(x);
        pixelImage.setPixel(x, y, pixel.getColor(this.colorMode));
      }
    }
    scene.placeImageXY(pixelImage, this.width / 2, this.height / 2);
    return scene;
  }

  // removes or inserts vertical and horizontal seams
  public void onTick() {
    if (this.isPlaying) {
      this.removeOrInsert();
    }
    else {
      if (this.badSeam != null) {
        if (this.isReversed) {
          this.insertBadSeam();
        }
        else {
          this.removeBadSeam();
        }
      }
    }
    if (this.pixels.get(0).isEmpty()) {
      this.isReversed = true;
    }
    else if (this.history.isEmpty() && this.badSeam == null) {
      this.isReversed = false;
    }
  }

  // removes or inserts seams from this.pixels
  void removeOrInsert() {
    if (this.isReversed) {
      this.insertSeam();
    }
    else {
      this.removeSeam();
    }
  }

  // inserts seams of pixels into this.pixels
  void insertSeam() {
    if (this.badSeam == null) {
      this.badSeam = this.history.pop();
      this.pixels = this.badSeam.insert(this.pixels);
      if (!Utils.getInstance().verifyPixelGraph(this.pixels)) {
        throw new IllegalStateException("Pixel Image is Ill-Formed");
      }
    }
    else {
      this.insertBadSeam();
    }

  }

  // completes seam insertion by unpainting red inserted pixels
  // and reseting the bad seam to null
  void insertBadSeam() {
    this.badSeam.unPaintRed();
    this.badSeam = null;
  }

  // finds the most boring seam or removes it if already found
  void removeSeam() {
    if (this.badSeam == null) {
      this.removeVert = Math.random() >= (double) (this.height) / (this.width + this.height);
      this.seamCarve();
    }
    else {
      this.removeBadSeam();
    }
  }

  // responsible for pausing, changing color modes, and
  // removing vertical and horizontal seams, and inserting
  // seams back when reversed
  public void onKeyEvent(String s) {
    if (s.equals(" ")) {
      this.isPlaying = !this.isPlaying;
    }
    if (s.equals("1")) {
      this.colorMode = 1;
    }
    if (s.equals("2")) {
      this.colorMode = 2;
    }
    if (!this.isPlaying && this.badSeam == null) {
      if (this.isReversed) {
        if (s.equals("i")) {
          this.insertSeam();
        }
      }
      else {
        if (s.equals("v")) {
          this.removeVert = true;
          this.seamCarve();
        }
        else if (s.equals("h")) {
          this.removeVert = false;
          this.seamCarve();
        }
      }
    }
  }

  // finds the most boring next seam
  void seamCarve() {
    Utils utils = Utils.getInstance();
    if (this.removeVert) {
      this.badSeam = utils.getSmallestSeam(utils.seamify(this.pixels, this.removeVert));
    }
    else {
      this.pixels = utils.transpose(this.pixels);
      this.badSeam = utils.getSmallestSeam(utils.seamify(this.pixels, this.removeVert));
      this.pixels = utils.transpose(this.pixels);
    }
    if (this.badSeam != null) {
      this.badSeam.paintRed();
    }
  }

  // removes current bad seam from this list of pixels
  void removeBadSeam() {
    Utils utils = Utils.getInstance();
    if (this.removeVert) {
      this.badSeam.removeSelf(this.pixels, this.pixels.size() - 1);
    }
    else {
      this.pixels = utils.transpose(this.pixels);
      this.badSeam.removeSelf(this.pixels, this.pixels.size() - 1);
      this.pixels = utils.transpose(this.pixels);

    }
    this.history.add(this.badSeam);
    this.badSeam = null;
    if (!utils.verifyPixelGraph(this.pixels)) {
      throw new IllegalStateException("Pixel Image is Ill-Formed");
    }
  }
}

// runs tests and big bang example
class ExamplesPixels {
  FromFileImage testImage1 = new FromFileImage("balloons.jpg");
  SeamCarving sc1 = new SeamCarving(testImage1);

  void testData(Tester t) {
    sc1.bigBang((int) testImage1.getWidth(), (int) testImage1.getHeight(), 0.01);
  }

  // ArrayList<ArrayList<Pixel>> testerImage;
  // ArrayList<ArrayList<Pixel>> testerB4;
  // BorderPixel border;
  // Pixel pixel00;
  // Pixel pixel01;
  // Pixel pixel02;
  // Pixel pixel10;
  // Pixel pixel11;
  // Pixel pixel12;
  // Pixel pixel20;
  // Pixel pixel21;
  // Pixel pixel22;
  // VertSeamInfo vSeam0;
  // VertSeamInfo vSeam1;
  // VertSeamInfo vSeam2;
  // VertSeamInfo vSeam3;
  // VertSeamInfo vSeam4;
  // VertSeamInfo vSeam6;
  // VertSeamInfo vSeam7;
  // VertSeamInfo vSeam8;
  // VertSeamInfo vSeam9;
  // HorizSeamInfo hSeam0;
  // HorizSeamInfo hSeam1;
  // HorizSeamInfo hSeam2;
  // HorizSeamInfo hSeam3;
  // HorizSeamInfo hSeam4;
  // HorizSeamInfo hSeam5;
  // HorizSeamInfo hSeam6;
  // SeamCarving carving;

  // ArrayList<ASeamInfo> memo;
  // ArrayList<ASeamInfo> memo2;
  // ArrayList<ASeamInfo> nullMemo;

  // // resets all data
  // void resetData() {
  //   this.border = new BorderPixel();
  //   this.pixel00 = new Pixel(new Color(100, 200, 50));
  //   this.pixel01 = new Pixel(new Color(150, 25, 150));
  //   this.pixel02 = new Pixel(new Color(100, 50, 50));
  //   this.pixel10 = new Pixel(new Color(0, 0, 50));
  //   this.pixel11 = new Pixel(new Color(200, 200, 50));
  //   this.pixel12 = new Pixel(new Color(150, 150, 150));
  //   this.pixel20 = new Pixel(new Color(50, 0, 0));
  //   this.pixel21 = new Pixel(new Color(0, 0, 0));
  //   this.pixel22 = new Pixel(new Color(150, 100, 200));
  //   Utils.getInstance().connectDownToUp(pixel00, border);
  //   Utils.getInstance().connectDownToUp(pixel10, border);
  //   Utils.getInstance().connectDownToUp(pixel20, border);
  //   Utils.getInstance().connectDownToUp(pixel01, pixel00);
  //   Utils.getInstance().connectDownToUp(pixel11, pixel10);
  //   Utils.getInstance().connectDownToUp(pixel21, pixel20);
  //   Utils.getInstance().connectDownToUp(pixel02, pixel01);
  //   Utils.getInstance().connectDownToUp(pixel12, pixel11);
  //   Utils.getInstance().connectDownToUp(pixel22, pixel21);
  //   Utils.getInstance().connectDownToUp(border, pixel02);
  //   Utils.getInstance().connectDownToUp(border, pixel12);
  //   Utils.getInstance().connectDownToUp(border, pixel22);
  //   Utils.getInstance().connectLeftToRight(border, pixel00);
  //   Utils.getInstance().connectLeftToRight(pixel00, pixel10);
  //   Utils.getInstance().connectLeftToRight(pixel10, pixel20);
  //   Utils.getInstance().connectLeftToRight(pixel20, border);
  //   Utils.getInstance().connectLeftToRight(border, pixel01);
  //   Utils.getInstance().connectLeftToRight(pixel01, pixel11);
  //   Utils.getInstance().connectLeftToRight(pixel11, pixel21);
  //   Utils.getInstance().connectLeftToRight(pixel21, border);
  //   Utils.getInstance().connectLeftToRight(border, pixel02);
  //   Utils.getInstance().connectLeftToRight(pixel02, pixel12);
  //   Utils.getInstance().connectLeftToRight(pixel12, pixel22);
  //   Utils.getInstance().connectLeftToRight(pixel22, border);
  //   this.testerImage = new ArrayList<ArrayList<Pixel>>(
  //       Arrays.asList(new ArrayList<Pixel>(Arrays.asList(pixel00, pixel10, pixel20)),
  //           new ArrayList<Pixel>(Arrays.asList(pixel01, pixel11, pixel21)),
  //           new ArrayList<Pixel>(Arrays.asList(pixel02, pixel12, pixel22))));
  //   this.vSeam0 = new VertSeamInfo(pixel00, pixel00.energy(), null);
  //   this.vSeam1 = new VertSeamInfo(pixel10, pixel10.energy(), null);
  //   this.vSeam2 = new VertSeamInfo(pixel20, pixel20.energy(), null);
  //   this.vSeam3 = new VertSeamInfo(pixel21, pixel21.energy() + vSeam1.totalWeight, vSeam1);
  //   this.vSeam4 = new VertSeamInfo(pixel12, pixel12.energy() + vSeam3.totalWeight, vSeam3);
  //   this.vSeam6 = new VertSeamInfo(pixel11, pixel11.energy() + vSeam2.totalWeight, vSeam2);
  //   this.vSeam7 = new VertSeamInfo(pixel22, pixel22.energy() + vSeam6.totalWeight, vSeam6);
  //   this.vSeam8 = new VertSeamInfo(pixel02, pixel02.energy() + vSeam6.totalWeight, vSeam6);
  //   this.vSeam9 = new VertSeamInfo(pixel12, pixel02.energy() + vSeam6.totalWeight, vSeam6);
  //   this.hSeam0 = new HorizSeamInfo(pixel00, pixel00.energy(), null);
  //   this.hSeam1 = new HorizSeamInfo(pixel01, pixel01.energy(), null);
  //   this.hSeam2 = new HorizSeamInfo(pixel12, pixel12.energy() + hSeam1.totalWeight, hSeam1);
  //   this.hSeam3 = new HorizSeamInfo(pixel22, pixel22.energy() + hSeam2.totalWeight, hSeam2);
  //   this.hSeam4 = new HorizSeamInfo(pixel11, pixel11.energy() + hSeam0.totalWeight, hSeam0);
  //   this.hSeam5 = new HorizSeamInfo(pixel21, pixel21.energy() + hSeam4.totalWeight, hSeam4);
  //   this.hSeam6 = new HorizSeamInfo(pixel20, pixel20.energy() + hSeam4.totalWeight, hSeam4);
  //   this.memo = new ArrayList<ASeamInfo>(Arrays.asList(vSeam0, vSeam1, vSeam2));
  //   this.memo2 = new ArrayList<ASeamInfo>(Arrays.asList(hSeam3, hSeam5, hSeam6));
  //   this.nullMemo = new ArrayList<ASeamInfo>(Arrays.asList(null, null, null));
  //   this.carving = new SeamCarving(testerImage);
  // }

  // // disconnects all pixels
  // void resetUnconnected() {
  //   this.resetData();
  //   for (ArrayList<Pixel> rows : testerImage) {
  //     for (IPixel pix : rows) {
  //       pix.separate();
  //     }
  //   }
  // }

  // // makes an invalid graph
  // void makeBadImage() {
  //   Utils.getInstance().connectDownToUp(pixel00, border);
  //   Utils.getInstance().connectDownToUp(pixel10, border);
  //   Utils.getInstance().connectDownToUp(pixel01, pixel00);
  //   Utils.getInstance().connectLeftToRight(border, pixel00);
  //   Utils.getInstance().connectLeftToRight(pixel00, pixel10);
  //   Utils.getInstance().connectLeftToRight(pixel10, border);
  // }

  // void makeRemovedVert() {
  //   this.resetData();
  //   Utils.getInstance().connectDownToUp(pixel00, border);
  //   Utils.getInstance().connectDownToUp(pixel20, border);
  //   Utils.getInstance().connectDownToUp(pixel01, pixel00);
  //   Utils.getInstance().connectDownToUp(pixel11, pixel20);
  //   Utils.getInstance().connectDownToUp(pixel02, pixel01);
  //   Utils.getInstance().connectDownToUp(pixel22, pixel11);
  //   Utils.getInstance().connectDownToUp(border, pixel02);
  //   Utils.getInstance().connectDownToUp(border, pixel22);
  //   Utils.getInstance().connectLeftToRight(border, pixel00);
  //   Utils.getInstance().connectLeftToRight(pixel00, pixel20);
  //   Utils.getInstance().connectLeftToRight(pixel20, border);
  //   Utils.getInstance().connectLeftToRight(border, pixel01);
  //   Utils.getInstance().connectLeftToRight(pixel01, pixel11);
  //   Utils.getInstance().connectLeftToRight(pixel11, border);
  //   Utils.getInstance().connectLeftToRight(border, pixel02);
  //   Utils.getInstance().connectLeftToRight(pixel02, pixel22);
  //   Utils.getInstance().connectLeftToRight(pixel22, border);
  //   this.testerB4 = new ArrayList<ArrayList<Pixel>>(
  //       Arrays.asList(new ArrayList<Pixel>(Arrays.asList(pixel00, pixel20)),
  //           new ArrayList<Pixel>(Arrays.asList(pixel01, pixel11)),
  //           new ArrayList<Pixel>(Arrays.asList(pixel02, pixel22))));
  // }

  // void makeRemovedHoriz() {
  //   this.resetData();
  //   Utils.getInstance().connectDownToUp(pixel00, border);
  //   Utils.getInstance().connectDownToUp(pixel10, border);
  //   Utils.getInstance().connectDownToUp(pixel20, border);
  //   Utils.getInstance().connectDownToUp(pixel02, pixel00);
  //   Utils.getInstance().connectDownToUp(pixel11, pixel10);
  //   Utils.getInstance().connectDownToUp(pixel21, pixel20);
  //   Utils.getInstance().connectDownToUp(border, pixel02);
  //   Utils.getInstance().connectDownToUp(border, pixel11);
  //   Utils.getInstance().connectDownToUp(border, pixel21);
  //   Utils.getInstance().connectLeftToRight(border, pixel00);
  //   Utils.getInstance().connectLeftToRight(pixel00, pixel10);
  //   Utils.getInstance().connectLeftToRight(pixel10, pixel20);
  //   Utils.getInstance().connectLeftToRight(pixel20, border);
  //   Utils.getInstance().connectLeftToRight(pixel02, pixel11);
  //   Utils.getInstance().connectLeftToRight(pixel11, pixel21);
  //   Utils.getInstance().connectLeftToRight(pixel21, border);
  //   Utils.getInstance().connectLeftToRight(border, pixel02);
  //   this.testerB4 = new ArrayList<ArrayList<Pixel>>(
  //       Arrays.asList(new ArrayList<Pixel>(Arrays.asList(pixel00, pixel10, pixel20)),
  //           new ArrayList<Pixel>(Arrays.asList(pixel02, pixel11, pixel21))));
  // }

  // void testAnimation(Tester t) {
  //   sc1.bigBang((int) testImage1.getWidth(), (int) testImage1.getHeight(), 0.01);
  // }

  // void testSetPixels(Tester t) {
  //   this.resetUnconnected();
  //   this.pixel00.setUp(pixel10);
  //   this.pixel22.setUp(pixel12);
  //   t.checkExpect(pixel00, new Pixel(pixel00, pixel10, border, border, border));
  //   t.checkExpect(pixel22, new Pixel(pixel22, pixel12, border, border, border));
  //   this.pixel00.setDown(pixel10);
  //   this.pixel22.setDown(pixel12);
  //   t.checkExpect(pixel00, new Pixel(pixel00, pixel10, pixel10, border, border));
  //   t.checkExpect(pixel22, new Pixel(pixel22, pixel12, pixel12, border, border));
  //   this.pixel00.setLeft(pixel12);
  //   this.pixel22.setRight(pixel20);
  //   t.checkExpect(pixel00, new Pixel(pixel00, pixel10, pixel10, pixel12, border));
  //   t.checkExpect(pixel22, new Pixel(pixel22, pixel12, pixel12, border, pixel20));
  // }

  // void testGetPixels(Tester t) {
  //   this.resetData();
  //   t.checkExpect(this.pixel01.getDown(), this.pixel02);
  //   t.checkExpect(this.pixel12.getDown(), this.border);
  //   t.checkExpect(this.pixel20.getDown(), this.pixel21);
  //   t.checkExpect(this.pixel01.getUp(), this.pixel00);
  //   t.checkExpect(this.pixel12.getUp(), this.pixel11);
  //   t.checkExpect(this.pixel20.getUp(), this.border);
  //   t.checkExpect(this.pixel01.getLeft(), this.border);
  //   t.checkExpect(this.pixel12.getLeft(), this.pixel02);
  //   t.checkExpect(this.pixel20.getLeft(), this.pixel10);
  //   t.checkExpect(this.pixel01.getRight(), this.pixel11);
  //   t.checkExpect(this.pixel12.getRight(), this.pixel22);
  //   t.checkExpect(this.pixel20.getRight(), this.border);
  // }

  // void testBrightness(Tester t) {
  //   this.resetData();
  //   t.checkInexact(this.pixel00.brightness(), 0.457, 0.01);
  //   t.checkInexact(this.pixel11.brightness(), 0.588, 0.01);
  //   t.checkInexact(this.pixel22.brightness(), 0.588, 0.01);
  //   t.checkInexact(this.border.brightness(), 0.0, 0.01);
  // }

  // void testHorizEnergy(Tester t) {
  //   this.resetData();
  //   t.checkInexact(this.pixel00.horizEnergy(), -0.718, 0.01);
  //   t.checkInexact(this.pixel11.horizEnergy(), 0.915, 0.01);
  //   t.checkInexact(this.pixel22.horizEnergy(), 1.764, 0.01);
  // }

  // void testVertiEnergy(Tester t) {
  //   this.resetData();
  //   t.checkInexact(this.pixel00.vertEnergy(), -1.437, 0.01);
  //   t.checkInexact(this.pixel11.vertEnergy(), -1.372, 0.01);
  //   t.checkInexact(this.pixel22.vertEnergy(), 0.588, 0.01);
  // }

  // void testEnergy(Tester t) {
  //   this.resetData();
  //   t.checkInexact(this.pixel00.energy(), 1.607, 0.01);
  //   t.checkInexact(this.pixel11.energy(), 1.649, 0.01);
  //   t.checkInexact(this.pixel22.energy(), 1.860, 0.01);
  // }

  // void testSameness(Tester t) {
  //   this.resetData();
  //   t.checkExpect(this.pixel01.sameIPixelAs(pixel02), false);
  //   t.checkExpect(this.pixel11.sameIPixelAs(pixel11), true);
  //   t.checkExpect(this.pixel01.sameIPixelAs(border), false);
  //   t.checkExpect(this.pixel01.samePixelAs(pixel20), false);
  //   t.checkExpect(this.pixel02.samePixelAs(pixel02), true);
  //   t.checkExpect(this.border.samePixelAs(pixel02), false);
  //   t.checkExpect(this.pixel01.sameBorderPixelAs(border), false);
  //   t.checkExpect(this.border.sameBorderPixelAs(border), true);
  // }

  // void testGetSeamOrNull(Tester t) {
  //   this.resetData();
  //   t.checkExpect(Utils.getInstance().getSeamOrNull(memo, 2), vSeam2);
  //   t.checkExpect(Utils.getInstance().getSeamOrNull(memo, 20), null);
  // }

  // void testRemoveSelf(Tester t) {
  //   this.resetData();
  //   this.vSeam4.removeSelf(testerImage, 2);
  //   t.checkExpect(this.testerImage.get(1).get(0).sameIPixelAs(pixel01), true);
  //   t.checkExpect(this.testerImage.get(0).get(1).getLeft().sameIPixelAs(pixel00), true);
  //   t.checkExpect(this.testerImage.get(1).get(1).getRight().sameIPixelAs(border), true);
  //   t.checkExpect(this.testerImage.get(2).get(1).getLeft().sameIPixelAs(pixel02), true);
  //   t.checkExpect(Utils.getInstance().verifyPixelGraph(testerImage), true);
  //   this.resetData();
  //   this.hSeam3.removeSelf(testerImage, 2);
  //   t.checkExpect(this.testerImage.get(1).get(0).sameIPixelAs(pixel01), true);
  //   t.checkExpect(this.testerImage.get(1).get(1).sameIPixelAs(pixel12), false);
  //   t.checkExpect(this.testerImage.get(1).get(2).sameIPixelAs(pixel21), true);
  // }

  // void testPaintRed(Tester t) {
  //   this.resetData();
  //   this.vSeam4.paintRed();
  //   t.checkExpect(this.vSeam3.pixel.getColor(), Color.RED);
  // }

  // void testConnect(Tester t) {
  //   this.resetUnconnected();
  //   Utils.getInstance().connectLeftToRight(pixel00, pixel10);
  //   t.checkExpect(this.pixel00.getRight(), pixel10);
  //   t.checkExpect(this.pixel10.getLeft(), pixel00);
  //   Utils.getInstance().connectLeftToRight(pixel02, pixel12);
  //   t.checkExpect(this.pixel02.getRight(), pixel12);
  //   t.checkExpect(this.pixel12.getLeft(), pixel02);

  //   this.resetUnconnected();
  //   Utils.getInstance().connectDownToUp(pixel11, pixel10);
  //   t.checkExpect(this.pixel11.getUp(), pixel10);
  //   t.checkExpect(this.pixel10.getDown(), pixel11);
  // }

  // void testConstructPixelGraph(Tester t) {
  //   this.resetUnconnected();
  // }

  // void testVerifyPixelGraph(Tester t) {
  //   this.resetUnconnected();
  //   t.checkExpect(Utils.getInstance().verifyPixelGraph(this.testerImage), true);
  //   this.resetData();
  //   t.checkExpect(Utils.getInstance().verifyPixelGraph(this.testerImage), true);
  //   this.makeBadImage();
  //   t.checkExpect(Utils.getInstance().verifyPixelGraph(this.testerImage), false);
  // }

  // void testSeamifyMemo(Tester t) {
  //   this.resetData();
  //   t.checkExpect(Utils.getInstance().seamifyMemo(this.pixel00, this.nullMemo, 0, true), vSeam0);
  //   t.checkExpect(Utils.getInstance().seamifyMemo(this.pixel01, this.memo, 0, true),
  //       new VertSeamInfo(pixel01, pixel01.energy() + vSeam0.totalWeight, vSeam0));

  // }

  // void testGetColor(Tester t) {
  //   this.resetData();
  //   t.checkExpect(this.pixel00.getColor(), new Color(100, 200, 50));
  //   this.vSeam4.paintRed();
  //   t.checkExpect(this.pixel21.getColor(), Color.RED);
  // }

  // void testUnPaintRed(Tester t) {
  //   this.resetData();
  //   this.vSeam4.paintRed();
  //   this.vSeam7.unPaintRed();
  //   t.checkExpect(this.pixel10.getColor(), new Color(255, 0, 0));
  //   t.checkExpect(this.pixel22.getColor(), new Color(150, 100, 200));
  //   t.checkExpect(this.pixel12.getColor(), Color.RED);
  // }

  // void testReValidate(Tester t) {
  //   this.resetUnconnected();
  //   this.pixel02 = new Pixel((this.pixel02), pixel01, border, border, pixel12);
  //   this.pixel22 = new Pixel((this.pixel22), pixel21, border, pixel12, border);
  //   ((Pixel) this.pixel02).revalidate();
  //   ((Pixel) this.pixel22).revalidate();
  //   t.checkExpect(this.pixel02.getLeft(), this.border);
  //   t.checkExpect(this.pixel02.getDown(), this.border);
  //   t.checkExpect(this.pixel02.getRight(), this.pixel12);
  //   t.checkExpect(this.pixel22.getRight(), this.border);
  //   t.checkExpect(this.pixel22.getLeft(), this.pixel12);
  //   t.checkExpect(this.pixel22.getUp(), this.pixel21);

  // }

  // void testTranspose(Tester t) {
  //   this.resetData();
  //   t.checkExpect(Utils.getInstance().transpose(this.testerImage),
  //       new ArrayList<ArrayList<Pixel>>(
  //           Arrays.asList(new ArrayList<Pixel>(Arrays.asList(pixel00, pixel01, pixel02)),
  //               new ArrayList<Pixel>(Arrays.asList(pixel10, pixel11, pixel12)),
  //               new ArrayList<Pixel>(Arrays.asList(pixel20, pixel21, pixel22)))));
  // }

  // void testGetSmallestSeam(Tester t) {
  //   this.resetData();
  //   t.checkExpect(Utils.getInstance().getSmallestSeam(this.memo), this.vSeam2);
  //   t.checkExpect(Utils.getInstance().getSmallestSeam(this.memo2), this.hSeam6);
  // }

  // void testMakeNextScene(Tester t) {
  //   this.resetData();
  //   t.checkExpect(this.hSeam2.makeNextSeam(this.pixel22, pixel22.energy() + hSeam2.totalWeight),
  //       this.hSeam3);
  //   t.checkExpect(this.vSeam1.makeNextSeam(this.pixel21, pixel21.energy() + vSeam1.totalWeight),
  //       this.vSeam3);
  // }

  // void testInsert(Tester t) {
  //   this.resetData();
  //   this.makeRemovedVert();
  //   t.checkExpect(this.vSeam4.insert(testerB4), testerImage);
  //   this.resetData();
  //   this.makeRemovedHoriz();
  //   t.checkExpect(this.hSeam3.insert(testerB4), testerImage);
  // }

  // void testInsertHelper(Tester t) {
  //   this.resetData();
  //   this.makeRemovedVert();
  //   t.checkExpect(this.vSeam4.insertHelper(testerB4, 0), testerImage);
  //   this.resetData();
  //   this.makeRemovedHoriz();
  //   t.checkExpect(this.hSeam3.insertHelper(Utils.getInstance().transpose(testerB4), 0).size(),
  //       testerImage.size());
  //   t.checkExpect(this.hSeam3.insertHelper(Utils.getInstance().transpose(testerB4), 0).get(0).size(),
  //       testerImage.get(0).size());
  // }

  // void testMakeScene(Tester t) {
  //   this.resetData();
  //   t.checkExpect(this.carving.makeScene().height, this.testerImage.size());
  //   t.checkExpect(this.carving.makeScene().width, this.testerImage.get(0).size());
  // }

  // void testOnTick(Tester t) {
  //   this.resetData();
  //   this.carving.isPlaying = false;
  //   this.carving.onTick();
  //   this.carving.isPlaying = true;
  //   t.checkExpect(this.carving, new SeamCarving(this.testerImage));
  // }
}
