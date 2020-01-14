import React, { Component } from 'react';
import PropTypes from 'prop-types';
import interact from 'interactjs';

import connectToDatoCms from './connectToDatoCms';
import './style.css';

@connectToDatoCms(plugin => ({
  token: plugin.parameters.global.datoCmsApiToken,
  maxRecords: plugin.parameters.instance.maxRecords,
  itemId: plugin.itemId,
  fieldPath: plugin.fieldPath,
  getFieldValue: plugin.getFieldValue,
  setFieldValue: plugin.setFieldValue,
  addFieldChangeListener: plugin.addFieldChangeListener,
}))
export default class Main extends Component {
  static propTypes = {
    maxRecords: PropTypes.number,
    fieldPath: PropTypes.string,
    getFieldValue: PropTypes.func,
    setFieldValue: PropTypes.func,
    addFieldChangeListener: PropTypes.func,
  };

  state = {
    loading: false,
    dropDown: false,
    data: [],
    values: [],
  };

  componentDidMount() {
    const { addFieldChangeListener } = this.props;

    this.updateData();

    addFieldChangeListener('subtitle_files', () => {
      this.updateData();
    });
  }

  getLanguageItem(item) {
    const { setFieldValue, fieldPath } = this.props;
    const { values } = this.state;

    const languageName = this.detectLanguageFromLocale(item);

    return (
      <div
        className="language-box"
        key={`subtitle_${item}`}
        id={`subtitle_${item}`}
      >
        <div>{`${languageName || item}`}</div>
        <button
          type="button"
          className="cross"
          onClick={() => {
            const newValues = values.filter(v => v !== item);
            this.setState({
              values: newValues,
            });
            setFieldValue(fieldPath, JSON.stringify(newValues));
          }}
        >
          <svg
            className="svg-cross"
            height="14"
            width="14"
            viewBox="0 0 20 20"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M14.348 14.849c-0.469 0.469-1.229 0.469-1.697 0l-2.651-3.030-2.651 3.029c-0.469 0.469-1.229 0.469-1.697 0-0.469-0.469-0.469-1.229 0-1.697l2.758-3.15-2.759-3.152c-0.469-0.469-0.469-1.228 0-1.697s1.228-0.469 1.697 0l2.652 3.031 2.651-3.031c0.469-0.469 1.228-0.469 1.697 0s0.469 1.229 0 1.697l-2.758 3.152 2.758 3.15c0.469 0.469 0.469 1.229 0 1.698z" />
          </svg>
        </button>
      </div>
    );
  }

  getLanguageOption(lang) {
    const { setFieldValue, fieldPath } = this.props;
    const { values } = this.state;

    const languageName = this.detectLanguageFromLocale(lang);

    return (
      <li
        key={`dropDownItem_${lang}`}
        className="dropDownItem"
        onClick={() => {
          const newValues = [...values, lang];
          setFieldValue(fieldPath, JSON.stringify(newValues));
          this.setState({
            values: newValues,
          });
        }}
      >
        {`${languageName || lang}`}
      </li>
    );
  }

  detectLanguageFromLocale(locale) {
    const languages = { cze: 'Čeština', eng: 'Angličtina', ger: 'Němčina' };
    return languages[locale];
  }

  toggleDropDown(e) {
    const { dropDown } = this.state;

    if (e.target === e.currentTarget) {
      this.setState({
        dropDown: !dropDown,
      });
    }
  }

  initializeInteract() {
    const position = { x: 0, y: 0 };
    const { setFieldValue, fieldPath } = this.props;
    const { values } = this.state;

    interact('.language-box').dropzone({
      overlap: 0.05,

      ondropactivate(event) {
        event.target.classList.toggle('drop-active');
      },
      ondragenter(event) {
        event.relatedTarget.classList.toggle('can-drop');
      },
      ondragleave(event) {
        event.relatedTarget.classList.toggle('can-drop');
      },
      ondrop(event) {
        const dropzoneArrayIndex = values.indexOf(
          event.target.id.split('_')[1],
        );
        const draggableArrayIndex = values.indexOf(
          event.relatedTarget.id.split('_')[1],
        );

        const removedValue = values.splice(
          dropzoneArrayIndex,
          1,
          values[draggableArrayIndex],
        );
        values.splice(draggableArrayIndex, 1, removedValue[0]);

        event.relatedTarget.classList.toggle('can-drop');
        setFieldValue(fieldPath, JSON.stringify(values));
        this.setState({
          values,
        });
      },
      ondropdeactivate(event) {
        const e = event;
        e.target.classList.toggle('drop-active');
        e.relatedTarget.style.transform = 'translate(0px, 0px)';
        position.x = 0;
      },
    });

    interact('.language-box').draggable({
      modifiers: [
        interact.modifiers.restrictRect({
          restriction: 'parent',
          endOnly: false,
        }),
      ],
      startAxis: 'x',
      lockAxis: 'x',
      listeners: {
        move(event) {
          if (values.length > 1) {
            const draggableElement = event.target;

            position.x += event.dx;
            position.y += event.dy;

            draggableElement.style.transform = `translate(${position.x}px, ${position.y}px)`;
          }
        },
      },
    });
  }

  updateData() {
    this.setState({
      loading: true,
    });

    const { getFieldValue, setFieldValue, fieldPath } = this.props;

    const files = getFieldValue('subtitle_files');
    const values = JSON.parse(getFieldValue(fieldPath)) || [];

    // fetch('https://nd-test.symbio.now.sh/api/subtitles/getSubtitlesLanguages', {
    fetch('http://localhost:3000/api/subtitles/getSubtitlesLanguages', {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(files.map(f => f.upload_id)),
    })
      .then(({ data }) => {
        // filter out invalid languages
        const langs = data.map(d => d.lang);

        const newValues = values.filter(v => langs.indexOf(v) !== -1);
        setFieldValue(fieldPath, JSON.stringify(newValues));
        this.setState({
          data: langs,
          values: newValues,
        });

        this.initializeInteract();
      })
      .finally(() => {
        this.setState({
          loading: false,
        });
      });
  }

  render() {
    const { loading, dropDown, values, data } = this.state;
    const { maxRecords } = this.props;

    if (loading) {
      return <div className="container">Načítám data...</div>;
    }

    return (
      <div className="container">
        <div
          role="button"
          tabIndex="0"
          className="select-container"
          onClick={e => {
            this.toggleDropDown(e);
          }}
          onKeyDown={e => {
            this.toggleDropDown(e);
          }}
        >
          {Array.isArray(values) && values.length > 0 ? (
            values.map(lang => this.getLanguageItem(lang))
          ) : (
            <span
              onClick={e => {
                this.toggleDropDown(e);
              }}
              role="button"
              tabIndex="0"
            >
              Vyberte maximálně 2 jazyky...
            </span>
          )}
          <div
            onClick={e => {
              this.toggleDropDown(e);
            }}
            aria-hidden="true"
            className="dropDownArrow"
          >
            <svg
              onClick={e => {
                this.toggleDropDown(e);
              }}
              height="20"
              width="20"
              viewBox="0 0 20 20"
              aria-hidden="true"
              focusable="false"
              className="css-19bqh2r"
            >
              <path d="M4.516 7.548c0.436-0.446 1.043-0.481 1.576 0l3.908 3.747 3.908-3.747c0.533-0.481 1.141-0.446 1.574 0 0.436 0.445 0.408 1.197 0 1.615-0.406 0.418-4.695 4.502-4.695 4.502-0.217 0.223-0.502 0.335-0.787 0.335s-0.57-0.112-0.789-0.335c0 0-4.287-4.084-4.695-4.502s-0.436-1.17 0-1.615z" />
            </svg>
          </div>
        </div>
        {dropDown && (
          <ul className="dropDown">
            {!Array.isArray(values) || values.length < maxRecords ? (
              Array.isArray(data) && data.length > 0 ? (
                data.map(lang => this.getLanguageOption(lang))
              ) : (
                <div>Žádné titulky nejsou k dispozici...</div>
              )
            ) : (
              <div>Vybrán maximální počet titulků ({maxRecords})...</div>
            )}
          </ul>
        )}
      </div>
    );
  }
}
