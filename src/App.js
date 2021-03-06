import React from "react";
import {
  StyleSheet,
  Text,
  View,
  Button,
  TextInput,
  Platform,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Image
} from "react-native";
import { DocumentPicker } from "expo";
import { Ionicons } from "@expo/vector-icons";
import { AsyncStorage } from "react-native";
import ReactDOM from "react-dom";

const SERVER_URL = "http://192.168.0.9:1337/parse/";
const APP_ID = "testItems";
const MASTER_KEY = "123456";

if (Platform.OS === "web") {
  var Parse = require("parse");
} else {
  var Parse = require("parse/react-native");
}

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      items: [],
      itemName: "",
      fileBase64: undefined,
      document: props.document
    };
    this.myRef = React.createRef();
    this.initializeParse();
    this.initializeList();
  }

  initializeParse = () => {
    Parse.setAsyncStorage(AsyncStorage);
    Parse.serverURL = SERVER_URL;
    Parse.initialize(APP_ID, MASTER_KEY);
  };

  initializeList = () => {
    const query = new Parse.Query("Item");
    query.find({
      success: results => {
        console.log("Successfully retrieved " + results.length + " items.");
        this.setState({
          items: results
        });
      },
      error: error => {
        alert("Error: " + error.code + " " + error.message);
      }
    });
    this.registerLiveQuery(query);
  };

  registerLiveQuery = query => {
    let subscription = query.subscribe();
    subscription.on("create", object => {
      this.addItemOnState(object);
    });
    subscription.on("update", object => {
      this.updateItemOnState(object);
    });
    subscription.on("delete", object => {
      this.deleteItemOnState(object);
    });
  };

  addItemParse = (itemName, fileBase64) => {
    let item = new Item();
    item.save(
      {
        nome: itemName,
        file: fileBase64
      },
      {
        success: item => {
          console.log(item.id + " added");
        },
        error: (item, error) => {
          alert(
            "Failed to create new object, with error code: " + error.message
          );
        }
      }
    );
  };

  deleteItemParse = item => {
    item.destroy({
      success: myObject => {
        console.log("Deleted object: " + myObject.id);
        this.deleteItemOnState(myObject);
      },
      error: function(myObject, error) {
        console.log("Failed deleting object. Error: " + error);
      }
    });
  };

  addItemOnState = object => {
    let items = this.state.items;
    items.push(object);
    this.setState({
      items: items
    });
  };

  updateItemOnState = object => {
    let items = this.state.items;
    const index = items.indexOf(items.find(item => item.id === object.id));
    items[index] = object;
    this.setState({
      items: items
    });
  };

  deleteItemOnState = object => {
    this.setState({
      items: this.state.items.filter(item => item.id !== object.id)
    });
  };

  addFileBase64ToState = async filePicked => {
    await fetch(filePicked.uri)
      .then(res => res.blob())
      .then(blob => {
        let reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onload = () => {
          this.setState({
            fileBase64: new Parse.File("filename", {
              base64: reader.result
            })
          });
        };
        reader.onerror = error => {
          throw new Error("There was an error reading the file " + error);
        };
      });
  };

  // CLICKS /////////////
  _onClickAdd = () => {
    this.addItemParse(this.state.itemName, this.state.fileBase64);
    //clean state
    this.setState({
      itemName: "",
      fileBase64: undefined
    });
  };

  _onClickDelete = item => {
    this.deleteItemParse(item);
  };

  _onClickPickFile = async () => {
    let filePicked = await DocumentPicker.getDocumentAsync();
    if (filePicked.type === "success") {
      console.log("User selected the file in " + filePicked.uri);
      this.addFileBase64ToState(filePicked);
    } else if (filePicked.type === "failed") {
      console.log("User cancelled the file picking");
    }
  };

  _onChangeFileWeb = e => {
    console.log(e.target.files[0]);
    let reader = new FileReader();
    reader.readAsDataURL(e.target.files[0]);
    reader.onload = () => {
      this.setState({
        fileBase64: new Parse.File("filename", {
          base64: reader.result
        })
      });
    };
    reader.onerror = error => {
      throw new Error("There was an error reading the file " + error);
    };
  };

  render() {
    return (
      <View style={styles.container}>
        <View style={styles.inputContainer}>
          <InputFile
            fileBase64={this.state.fileBase64}
            onChange={this._onChangeFileWeb}
            onClick={this._onClickPickFile}
          />

          <TextInput
            style={styles.textInputStyle}
            onChangeText={text => this.setState({ itemName: text })}
            placeholder="Insert new item"
            value={this.state.itemName}
          />

          <Button title="Add" onPress={this._onClickAdd} />
        </View>

        <Text style={styles.textItem}>{this.state.items.length} items</Text>

        <ListItems items={this.state.items} deleteItem={this._onClickDelete} />
      </View>
    );
  }
}

class InputFile extends React.Component {
  constructor(props) {
    super(props);
    this.myRef = React.createRef();
  }

  simulateClick(e) {
    e.click();
  }

  render() {
    if (Platform.OS == "web") {
      return (
        <div className="image-upload" style={{ width: 40, height: 40 }}>
          <label htmlFor="file-input">
            <Ionicons
              name="md-image"
              size={35}
              color={this.props.fileBase64 ? "#367ec1" : "#bbb"}
            />
          </label>

          <input
            type="file"
            id="file-input"
            onChange={this.props.onChange}
            style={{ visibility: "hidden" }}
          />
        </div>
      );
    } else {
      return (
        <TouchableOpacity
          onPress={this.props.onClick}
          style={styles.btContainer}
        >
          <Ionicons
            name="md-image"
            size={35}
            color={this.props.fileBase64 ? "#367ec1" : "#bbb"}
          />
        </TouchableOpacity>
      );
    }
  }
}

const ListItems = props => {
  let views = [];
  for (let i = 0; i < props.items.length; i++) {
    views.push(
      <ListElement
        style={{ flex: 1 }}
        item={props.items[i]}
        deleteItem={props.deleteItem}
        key={i}
      />
    );
  }
  return <ScrollView>{views}</ScrollView>;
};

const ListElement = props => (
  <View style={styles.itemContainer}>
    {props.item.get("file") && (
      <Image
        style={styles.imageItem}
        source={{
          uri: props.item.get("file") ? props.item.get("file").url() : null
        }}
      />
    )}
    <Text style={{ flex: 1 }}>{props.item.get("nome")}</Text>

    <TouchableOpacity onPress={() => props.deleteItem(props.item)}>
      <Ionicons name="md-trash" size={25} color={"#ae261f"} />
    </TouchableOpacity>
  </View>
);

class Item extends Parse.Object {
  constructor() {
    super("Item");
  }
}

const styles = StyleSheet.create({
  container: {
    marginTop: 30,
    padding: 10,
    marginBottom: 100,
    backgroundColor: "#fff"
  },

  inputContainer: {
    padding: 10,
    marginBottom: 20,
    alignItems: "center",
    flexDirection: "row",
    borderRadius: 3,
    backgroundColor: "#F0F0F0",
    shadowColor: "#000000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
    elevation: 1
  },

  textInputStyle: {
    flex: 1,
    padding: 2,
    height: 40,
    marginRight: 5,
    marginLeft: 5
  },

  btContainer: {
    justifyContent: "center"
  },

  itemContainer: {
    flex: 1,
    margin: 5,
    padding: 5,
    paddingLeft: 10,
    alignItems: "center",
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd"
  },

  textItem: {
    alignSelf: "center"
  },

  imageItem: {
    marginRight: 10,
    width: 35,
    height: 40
  }
});
