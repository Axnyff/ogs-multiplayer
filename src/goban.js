import React from "react";
import SVGoban from "svgoban";

/**
 * Converts shape list into React SVG elements.
 *
 * @param {Array} shape list
 * @returns {Array} React element list
 */
function toElem(shapes, callback) {
  let typeofShape;
  let txt = null;
  let k = 0;
  for (let i = 0; i < shapes.length; i++) {
    typeofShape = shapes[i].type;
    if (typeofShape === "text") {
      txt = shapes[i].txt;
      delete shapes[i].txt;
    }
    if (shapes[i].class) {
      shapes[i].className = shapes[i].class;
      delete shapes[i].class;
    }
    delete shapes[i].type;
    shapes[i].key = shapes[i].key || k++;
    if (callback) shapes[i].onClick = callback.bind(null, shapes[i].key); // Replace this by null for React
    shapes[i] = React.createElement(typeofShape, shapes[i], txt);
  }
  return shapes;
}

class LabelsLayer extends React.Component {
  shouldComponentUpdate(nextProps, nextState) {
    return (
      nextProps.size !== this.props.size ||
      nextProps.coordSystem !== this.props.coordSystem
    );
  }
  render() {
    let pseudoLabels = SVGoban.shapeLabels(
      this.props.size,
      this.props.coordSystem
    );
    return <g className="labels_layer">{toElem(pseudoLabels)}</g>;
  }
}

class BackgroundLayer extends React.Component {
  render() {
    let pseudoBackground = SVGoban.shapeBackground(this.props.noMargin);
    return <g className="background_layer">{toElem(pseudoBackground)}</g>;
  }
}

class GridLayer extends React.Component {
  shouldComponentUpdate(nextProps, nextState) {
    return nextProps.size !== this.props.size;
  }
  render() {
    let pseudoLines = SVGoban.shapeGrid(this.props.size);
    return <g className="grid_layer">{toElem(pseudoLines)}</g>;
  }
}

class StarPointsLayer extends React.Component {
  shouldComponentUpdate(nextProps, nextState) {
    return nextProps.size !== this.props.size;
  }
  render() {
    let pseudoStarPoints = SVGoban.shapeStarPoints(this.props.size);
    return <g className="starpoints_layer">{toElem(pseudoStarPoints)}</g>;
  }
}

class MarkersLayer extends React.Component {
  render() {
    let pseudoMarkers = SVGoban.shapeMarkers(
      this.props.size,
      this.props.markers,
      this.props.positions
    );
    return <g className="markers_layer">{toElem(pseudoMarkers)}</g>;
  }
}

class CompositeStonesLayer extends React.Component {
  handleClick = (intersection) => {
    this.props.onIntersectionClick(intersection);
  };
  render() {
    let i, j, skipI, hA1, vA1, haa, vaa, coordA1, coordaa, color;
    let size = +this.props.size;
    let items = [];

    for (i = 1; i <= size; i++) {
      skipI = i >= 9 ? 1 : 0;
      hA1 = String.fromCharCode(64 + i + skipI);
      haa = String.fromCharCode(96 + i);
      for (j = 1; j <= size; j++) {
        vA1 = j.toString();
        vaa = String.fromCharCode(96 + size - j + 1);
        coordA1 = hA1 + vA1;
        coordaa = haa + vaa;
        color =
          this.props.set[coordA1] || this.props.set[coordaa] || "placeholder";
        items.push(
          <Stone
            key={coordA1}
            size={this.props.size}
            intersection={coordA1}
            color={color}
            onIntersectionClick={this.handleClick}
          />
        );
      }
    }
    let cls = "stones_layer " + this.props.nextToPlay;
    return <g className={cls}>{items}</g>;
  }
}

class Stone extends React.Component {
  shouldComponentUpdate(nextProps, nextState) {
    let idem =
      nextProps.size === this.props.size &&
      nextProps.intersection === this.props.intersection &&
      nextProps.color === this.props.color;
    return !idem;
  }
  render() {
    let pseudoStone = SVGoban.shapeStone(
      this.props.size,
      this.props.intersection,
      this.props.color
    );
    return toElem(pseudoStone, this.props.onIntersectionClick)[0];
  }
}

class Style extends React.Component {
  shouldComponentUpdate(nextProps, nextState) {
    return nextProps.theme !== this.props.theme;
  }
  render() {
    return <style>{SVGoban.Themes[this.props.theme]()}</style>;
  }
}

class Definitions extends React.Component {
  shouldComponentUpdate(nextProps, nextState) {
    return false;
  }
  render() {
    let b = SVGoban.defineRadialColors("black");
    let w = SVGoban.defineRadialColors("white");
    return (
      <defs>
        <radialGradient id={"blackgrad"} {...b.gradient}>
          <stop
            offset="0%"
            style={{ "stop-color": b.a, "stop-opacity": "1" }}
          />
          <stop
            offset="100%"
            style={{ "stop-color": b.z, "stop-opacity": "1" }}
          />
        </radialGradient>
        <radialGradient id={"whitegrad"} {...w.gradient}>
          <stop
            offset="0%"
            style={{ "stop-color": w.a, "stop-opacity": "1" }}
          />
          <stop
            offset="100%"
            style={{ "stop-color": w.z, "stop-opacity": "1" }}
          />
        </radialGradient>
      </defs>
    );
  }
}

class Goban extends React.Component {
  render() {
    const {
      hideBorder,
      size = "19",
      theme = "classic",
      zoom,
      noMargin,
      coordSystem,
      stones,
      nextToPlay,
      onIntersectionClick,
      markers,
    } = this.props;
    let viewBox = SVGoban.shapeArea(hideBorder, zoom, size).join(" ");

    return (
      <div className="react-goban">
        <svg
          className="svgoban"
          viewBox={viewBox}
          xmlns="http://www.w3.org/2000/svg"
          version="1.1"
          height="100%"
        >
          <Style theme={theme} />
          <Definitions />
          <BackgroundLayer noMargin={noMargin} />
          <GridLayer size={size} />
          <StarPointsLayer size={size} />
          <LabelsLayer size={size} coordSystem={coordSystem} />
          <CompositeStonesLayer
            size={size}
            set={stones}
            nextToPlay={nextToPlay}
            onIntersectionClick={onIntersectionClick}
          />
          <MarkersLayer size={size} markers={markers} positions={stones} />
        </svg>
      </div>
    );
  }
}

export default Goban;
